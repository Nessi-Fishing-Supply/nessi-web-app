import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { listDirs, readFile, walkFiles, root } from './utils/fs.js';
import { titleCase } from './utils/labels.js';
import { writeJson } from './utils/output.js';
import type { Feature, FeatureLink } from './types.js';

/**
 * Extract the first paragraph after the first heading from a CLAUDE.md file.
 * Strips markdown formatting like ** and `.
 */
function extractDescription(markdown: string): string {
  const lines = markdown.split('\n');
  let pastFirstHeading = false;
  const paragraphLines: string[] = [];

  for (const line of lines) {
    if (!pastFirstHeading) {
      if (line.startsWith('#')) {
        pastFirstHeading = true;
      }
      continue;
    }

    const trimmed = line.trim();

    // Skip blank lines and sub-headings before the paragraph starts
    if (paragraphLines.length === 0 && (trimmed === '' || trimmed.startsWith('#'))) continue;

    // Stop at blank line after collecting paragraph text
    if (paragraphLines.length > 0 && trimmed === '') break;

    // Stop if we hit a heading after collecting text
    if (paragraphLines.length > 0 && trimmed.startsWith('#')) break;

    // Skip list items, tables, and other non-paragraph content
    if (trimmed.startsWith('- ') || trimmed.startsWith('| ')) break;

    paragraphLines.push(trimmed);
  }

  if (paragraphLines.length === 0) return '';

  return paragraphLines
    .join(' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

/**
 * Count files matching a pattern in a subdirectory of a feature.
 */
function countFiles(featureDir: string, subdir: string, pattern: RegExp): number {
  const fullPath = root('src', 'features', featureDir, subdir);
  if (!existsSync(fullPath)) return 0;
  return walkFiles(`src/features/${featureDir}/${subdir}`, pattern).length;
}

/**
 * Count API route files matching /api/{slug}/ pattern.
 */
function countApiRoutes(slug: string): number {
  const apiDir = root('src', 'app', 'api', slug);
  if (!existsSync(apiDir)) return 0;
  return walkFiles(`src/app/api/${slug}`, /^route\.ts$/).length;
}

/**
 * Extract unique Supabase table names referenced in a feature's source files.
 * Matches patterns like .from('table_name') or .from("table_name").
 */
function extractEntities(slug: string): string[] {
  const featureDir = root('src', 'features', slug);
  if (!existsSync(featureDir)) return [];

  const files = walkFiles(`src/features/${slug}`, /\.(ts|tsx)$/);
  const tables = new Set<string>();
  const pattern = /\.from\(['"]([a-z_]+)['"]\)/g;

  for (const relPath of files) {
    const content = readFileSync(root(relPath), 'utf-8');
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      tables.add(match[1]);
    }
  }

  return Array.from(tables).sort();
}

/**
 * Build a map of feature slug → set of journey slugs that reference it via codeRef.
 * Scans all journey JSON files in docs/journeys/, skipping schema.json and _example.json.
 */
function buildJourneyCrossRefs(): Map<string, Set<string>> {
  const journeyDir = root('docs', 'journeys');
  const map = new Map<string, Set<string>>();

  if (!existsSync(journeyDir)) return map;

  const SKIP = new Set(['schema.json', '_example.json']);

  for (const entry of readdirSync(journeyDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    if (SKIP.has(entry.name)) continue;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(readFileSync(join(journeyDir, entry.name), 'utf-8'));
    } catch {
      continue;
    }

    const journeySlug = (data.slug as string | undefined) ?? entry.name.replace('.json', '');
    const flows = (data.flows as unknown[]) ?? [];

    for (const flow of flows) {
      if (typeof flow !== 'object' || flow === null) continue;
      const steps = ((flow as Record<string, unknown>).steps as unknown[]) ?? [];

      for (const step of steps) {
        if (typeof step !== 'object' || step === null) continue;
        const codeRef = (step as Record<string, unknown>).codeRef;
        if (typeof codeRef !== 'string') continue;

        // Match src/features/{slug}/...
        const featureMatch = codeRef.match(/^src\/features\/([^/]+)\//);
        if (!featureMatch) continue;

        const featureSlug = featureMatch[1];
        if (!map.has(featureSlug)) map.set(featureSlug, new Set());
        map.get(featureSlug)!.add(journeySlug);
      }
    }
  }

  return map;
}

/**
 * Extract all features from src/features/ directories.
 */
export function extractFeatures(): Feature[] {
  const dirs = listDirs('src/features');
  const features: Feature[] = [];
  const journeyRefs = buildJourneyCrossRefs();

  for (const slug of dirs) {
    const name = titleCase(slug);

    // Read CLAUDE.md
    const claudePath = root('src', 'features', slug, 'CLAUDE.md');
    let claudeContent: string | null = null;
    let description: string;

    if (existsSync(claudePath)) {
      claudeContent = readFile('src', 'features', slug, 'CLAUDE.md');
      description = extractDescription(claudeContent) || `${name} feature`;
    } else {
      description = `${name} feature`;
    }

    const componentCount = countFiles(slug, 'components', /\.tsx$/);
    const hookCount = countFiles(slug, 'hooks', /\.ts$/);
    const serviceCount = countFiles(slug, 'services', /\.ts$/);
    const endpointCount = countApiRoutes(slug);

    const entities = extractEntities(slug);
    const journeySlugs = Array.from(journeyRefs.get(slug) ?? []).sort();

    // Build links array
    const links: FeatureLink[] = [];

    for (const table of entities) {
      links.push({ type: 'entity', label: table, href: '/data-model' });
    }

    for (const journeySlug of journeySlugs) {
      links.push({ type: 'journey', label: journeySlug, href: `/journeys/${journeySlug}` });
    }

    if (endpointCount > 0) {
      links.push({ type: 'api-group', label: name, href: '/api-map' });
    }

    features.push({
      slug,
      name,
      description,
      componentCount,
      endpointCount,
      hookCount,
      serviceCount,
      entities,
      journeySlugs,
      links,
    });
  }

  return features;
}

// CLI entrypoint
const isCli =
  import.meta.filename?.endsWith('extract-features.ts') ??
  process.argv[1]?.includes('extract-features');
if (isCli) {
  const features = extractFeatures();
  console.log(`Found ${features.length} features`);
  writeJson('features.json', { features });
}
