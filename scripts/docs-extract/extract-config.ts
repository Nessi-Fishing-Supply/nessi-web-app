/**
 * Extract config/enum definitions from feature constants and config files.
 *
 * Walks src/features/{feature}/constants and src/features/{feature}/config,
 * extracts value/label pairs using two patterns (array-of-objects and Record),
 * and writes config-reference.json.
 */

import { readFile, walkFiles } from './utils/fs.js';
import { titleCase } from './utils/labels.js';
import { writeJson } from './utils/output.js';
import type { ConfigEnum, ConfigValue } from './types.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_DIR = join(__dir, '..', '..', 'supabase', 'migrations');

// ---------------------------------------------------------------------------
// Pattern 1: Array of objects with { value: '...', label: '...', description?: '...' }
// ---------------------------------------------------------------------------

function extractArrayPattern(source: string): ConfigValue[] {
  const values: ConfigValue[] = [];

  // Match objects containing at least value + label string properties
  const objectRe =
    /\{\s*(?:[^}]*?,\s*)?value:\s*['"]([^'"]+)['"]\s*,\s*(?:[^}]*?,\s*)?label:\s*['"]([^'"]+)['"](?:\s*,\s*(?:[^}]*?,\s*)?description:\s*['"]([^'"]+)['"])?[^}]*\}/g;

  // Also handle label before value
  const objectReAlt =
    /\{\s*(?:[^}]*?,\s*)?label:\s*['"]([^'"]+)['"]\s*,\s*(?:[^}]*?,\s*)?value:\s*['"]([^'"]+)['"](?:\s*,\s*(?:[^}]*?,\s*)?description:\s*['"]([^'"]+)['"])?[^}]*\}/g;

  let match: RegExpExecArray | null;

  while ((match = objectRe.exec(source)) !== null) {
    const entry: ConfigValue = { value: match[1], label: match[2] };
    if (match[3]) entry.description = match[3];
    values.push(entry);
  }

  // Only use alt pattern if primary found nothing
  if (values.length === 0) {
    while ((match = objectReAlt.exec(source)) !== null) {
      const entry: ConfigValue = { value: match[2], label: match[1] };
      if (match[3]) entry.description = match[3];
      values.push(entry);
    }
  }

  return values;
}

// ---------------------------------------------------------------------------
// Pattern 2: Record<SomeType, string> = { key: 'Label', ... }
// ---------------------------------------------------------------------------

function extractRecordPattern(source: string): ConfigValue[] {
  const values: ConfigValue[] = [];

  // Match Record<..., string> = { ... } — take only the first match per file
  const recordRe = /Record<\w+,\s*string>\s*=\s*\{([^}]+)\}/;
  const recordMatch = recordRe.exec(source);

  if (recordMatch) {
    const body = recordMatch[1];
    // Match key: 'value' pairs, ignoring comments
    const pairRe = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
    let pairMatch: RegExpExecArray | null;
    while ((pairMatch = pairRe.exec(body)) !== null) {
      values.push({ value: pairMatch[1], label: pairMatch[2] });
    }
  }

  return values;
}

// ---------------------------------------------------------------------------
// Pattern for Record<Type, ConfigObject> with slug/label/description
// ---------------------------------------------------------------------------

function extractRecordObjectPattern(source: string): ConfigValue[] {
  const values: ConfigValue[] = [];

  // Match Record<..., SomeType> = { key: { slug: '...', label: '...', description: '...' }, ... }
  const recordObjRe = /Record<\w+,\s*\w+>\s*=\s*\{([\s\S]*?)\n\};/g;
  let recordMatch: RegExpExecArray | null;

  while ((recordMatch = recordObjRe.exec(source)) !== null) {
    const body = recordMatch[1];
    // Extract individual object entries with slug + label + optional description
    const entryRe =
      /slug:\s*['"]([^'"]+)['"]\s*,\s*\n\s*label:\s*['"]([^'"]+)['"]\s*,\s*\n\s*description:\s*\n?\s*['"]([^'"]+)['"]/g;
    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRe.exec(body)) !== null) {
      values.push({
        value: entryMatch[1],
        label: entryMatch[2],
        description: entryMatch[3],
      });
    }
  }

  return values;
}

// ---------------------------------------------------------------------------
// Multi-line description variant for condition.ts style
// ---------------------------------------------------------------------------

function extractArrayPatternMultiline(source: string): ConfigValue[] {
  const values: ConfigValue[] = [];

  // Match blocks like { value: '...', label: '...', ... description: '...' or description:\n'...' }
  const blockRe =
    /\{\s*\n\s*value:\s*['"]([^'"]+)['"]\s*,\s*\n\s*label:\s*['"]([^'"]+)['"]\s*,[\s\S]*?description:\s*\n?\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(source)) !== null) {
    values.push({
      value: match[1],
      label: match[2],
      description: match[3],
    });
  }

  return values;
}

// ---------------------------------------------------------------------------
// Database enum extraction from migration SQL files
// ---------------------------------------------------------------------------

function extractDbEnumConfigs(): ConfigEnum[] {
  const configs: ConfigEnum[] = [];

  let migrationFiles: string[];
  try {
    migrationFiles = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch {
    // No migrations directory — skip silently
    return configs;
  }

  // Regex to match: CREATE TYPE [schema.]name AS ENUM ( ... )
  // Handles optional schema prefix, multi-line enum bodies
  const enumRe = /CREATE\s+TYPE\s+(?:\w+\.)?(\w+)\s+AS\s+ENUM\s*\(([\s\S]*?)\)/gi;

  for (const filename of migrationFiles) {
    let sql: string;
    try {
      sql = readFile('supabase', 'migrations', filename);
    } catch {
      continue;
    }

    let match: RegExpExecArray | null;
    enumRe.lastIndex = 0;

    while ((match = enumRe.exec(sql)) !== null) {
      const enumName = match[1].toLowerCase();
      const body = match[2];

      // Skip status enums — those go to the lifecycle extractor
      if (enumName.includes('status')) continue;

      // Parse enum values from the body: 'value1', 'value2', ...
      const valueRe = /'([^']+)'/g;
      const values: ConfigValue[] = [];
      let valueMatch: RegExpExecArray | null;
      while ((valueMatch = valueRe.exec(body)) !== null) {
        const raw = valueMatch[1];
        values.push({
          value: raw,
          label: titleCase(raw),
        });
      }

      if (values.length === 0) continue;

      const slug = enumName.replace(/_/g, '-');
      const name = titleCase(enumName);
      const relativePath = `supabase/migrations/${filename}`;

      configs.push({
        slug,
        name,
        description: `Database enum ${name} with ${values.length} values`,
        source: relativePath,
        values,
      });
    }
  }

  return configs;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function featureFromPath(filePath: string): string {
  // src/features/<feature>/constants/foo.ts => feature
  const parts = filePath.split('/');
  const featIdx = parts.indexOf('features');
  return featIdx >= 0 ? parts[featIdx + 1] : 'unknown';
}

function filenameFromPath(filePath: string): string {
  const parts = filePath.split('/');
  const file = parts[parts.length - 1];
  return file.replace(/\.ts$/, '');
}

function buildSlug(feature: string, filename: string): string {
  return `${feature}-${filename}`;
}

function buildName(feature: string, filename: string): string {
  return `${titleCase(feature)} ${titleCase(filename)}`;
}

function buildDescription(name: string, count: number): string {
  return `${name} configuration with ${count} defined values`;
}

// ---------------------------------------------------------------------------
// Main extraction
// ---------------------------------------------------------------------------

export function extractConfigs(): ConfigEnum[] {
  let configs: ConfigEnum[] = [];

  // Walk constants and config directories
  const constantsFiles = walkFiles('src/features', /^(?!.*\.test\.)(?!index\.ts$).+\.ts$/);

  // Filter to only constants/ and config/ directories
  const relevantFiles = constantsFiles.filter((f) => {
    const parts = f.split('/');
    return parts.includes('constants') || parts.includes('config');
  });

  for (const filePath of relevantFiles) {
    const source = readFile(filePath);
    const feature = featureFromPath(filePath);
    const filename = filenameFromPath(filePath);

    // Try multi-line array pattern first (handles description spanning lines)
    let values = extractArrayPatternMultiline(source);

    // Then try simple array pattern
    if (values.length === 0) {
      values = extractArrayPattern(source);
    }

    // Try Record<Type, ConfigObject> pattern (categories config)
    if (values.length === 0) {
      values = extractRecordObjectPattern(source);
    }

    // Then try Record<Key, string> pattern
    if (values.length === 0) {
      values = extractRecordPattern(source);
    }

    // Skip files with no extractable values
    if (values.length === 0) continue;

    // Deduplicate by value (some files may match multiple patterns)
    const seen = new Set<string>();
    const deduped = values.filter((v) => {
      if (seen.has(v.value)) return false;
      seen.add(v.value);
      return true;
    });

    const slug = buildSlug(feature, filename);
    const name = buildName(feature, filename);

    configs.push({
      slug,
      name,
      description: buildDescription(name, deduped.length),
      source: filePath,
      values: deduped,
    });
  }

  // First, deduplicate TS configs that share the same values (e.g., categories vs category)
  const deduplicatedConfigs: typeof configs = [];
  const seenValueKeys = new Set<string>();
  for (const config of configs) {
    const valueKey = config.values
      .map((v) => v.value)
      .sort()
      .join('|');
    if (!seenValueKeys.has(valueKey)) {
      seenValueKeys.add(valueKey);
      deduplicatedConfigs.push(config);
    }
  }
  configs = deduplicatedConfigs;

  // Extract database enums and merge, deduplicating by value overlap
  const dbConfigs = extractDbEnumConfigs();

  // Build a set of all value-sets from TS configs for overlap detection
  const tsValueSets = configs.map((c) => new Set(c.values.map((v) => v.value)));

  for (const dbConfig of dbConfigs) {
    const dbValues = new Set(dbConfig.values.map((v) => v.value));
    // Check if any existing TS config has significant overlap (>50% shared values)
    const hasOverlap = tsValueSets.some((tsSet) => {
      const shared = [...dbValues].filter((v) => tsSet.has(v)).length;
      return shared > Math.min(dbValues.size, tsSet.size) * 0.5;
    });
    if (!hasOverlap) {
      configs.push(dbConfig);
    }
    // If overlap exists, the TypeScript version has richer labels — keep it
  }

  return configs.sort((a, b) => a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const configs = extractConfigs();
console.log(`Extracted ${configs.length} config enums:`);
for (const c of configs) {
  console.log(`  ${c.slug} (${c.values.length} values)`);
}
writeJson('config-reference.json', { configs });
