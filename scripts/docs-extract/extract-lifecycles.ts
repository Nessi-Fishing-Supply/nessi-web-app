import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { walkFiles, readFile } from './utils/fs.js';
import { titleCase } from './utils/labels.js';
import { writeJson } from './utils/output.js';
import type { Lifecycle, LifecycleState, LifecycleTransition } from './types.js';

const __dir =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dir, '..', '..');

/**
 * Hardcoded transition definitions for known entities.
 * These capture the real business rules that can't be inferred from labels alone.
 */
const KNOWN_TRANSITIONS: Record<string, LifecycleTransition[]> = {
  listing: [
    { from: 'draft', to: 'active', label: 'Publish' },
    { from: 'active', to: 'sold', label: 'Mark as sold' },
    { from: 'active', to: 'archived', label: 'Deactivate' },
    { from: 'draft', to: 'deleted', label: 'Delete draft' },
    { from: 'active', to: 'reserved', label: 'Reserve' },
    { from: 'reserved', to: 'sold', label: 'Complete sale' },
    { from: 'reserved', to: 'active', label: 'Release reservation' },
    { from: 'archived', to: 'active', label: 'Reactivate' },
  ],
  invite: [
    { from: 'pending', to: 'accepted', label: 'Accept invite' },
    { from: 'pending', to: 'expired', label: 'Expire' },
    { from: 'pending', to: 'revoked', label: 'Revoke' },
  ],
  // slug derived from table name shop_ownership_transfers -> ownership_transfers
  ownership_transfers: [
    { from: 'pending', to: 'accepted', label: 'Accept transfer' },
    { from: 'pending', to: 'cancelled', label: 'Cancel' },
  ],
};

/**
 * Read all SQL migration files from supabase/migrations/.
 */
function readMigrationFiles(): Array<{ filePath: string; content: string }> {
  const migrationsDir = join(ROOT, 'supabase', 'migrations');
  let files: string[];
  try {
    files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => join(migrationsDir, f));
  } catch {
    return [];
  }
  return files.map((filePath) => ({
    filePath,
    content: readFileSync(filePath, 'utf-8'),
  }));
}

/**
 * Parse `CREATE TYPE {name} AS ENUM ({values})` from SQL content.
 * Only captures types whose name contains 'status'.
 */
function parseEnumTypes(content: string): Array<{ enumName: string; values: string[] }> {
  const results: Array<{ enumName: string; values: string[] }> = [];
  // Match CREATE TYPE <name> AS ENUM ( ... ) — values may span multiple lines
  const enumRegex = /CREATE\s+TYPE\s+(?:public\.)?(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;

  let match: RegExpExecArray | null;
  while ((match = enumRegex.exec(content)) !== null) {
    const enumName = match[1].toLowerCase();
    if (!enumName.includes('status')) continue;

    const rawValues = match[2];
    const values = [...rawValues.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (values.length > 0) {
      results.push({ enumName, values });
    }
  }
  return results;
}

/**
 * Parse `CHECK ({column} IN ({values}))` from SQL content.
 * Only captures columns whose name ends with 'status'.
 *
 * When an inline CHECK uses the bare column name 'status', we attempt to infer
 * the entity slug from the enclosing CREATE TABLE statement. For example, a
 * `status` column in `CREATE TABLE public.shop_ownership_transfers` becomes
 * the slug `ownership_transfer`.
 */
function parseCheckConstraints(content: string): Array<{ columnName: string; values: string[] }> {
  const results: Array<{ columnName: string; values: string[] }> = [];
  const checkRegex = /CHECK\s*\(\s*(\w+)\s+IN\s*\(([^)]+)\)\s*\)/gi;

  let match: RegExpExecArray | null;
  while ((match = checkRegex.exec(content)) !== null) {
    const rawColumn = match[1].toLowerCase();
    if (!rawColumn.endsWith('status') && rawColumn !== 'status') continue;

    const rawValues = match[2];
    const values = [...rawValues.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    if (values.length === 0) continue;

    let columnName = rawColumn;

    // If the column is just 'status', try to derive entity name from nearest
    // preceding CREATE TABLE statement in the same file segment.
    if (rawColumn === 'status') {
      const precedingText = content.slice(0, match.index);
      const tableMatch = precedingText.match(
        /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(/gi,
      );
      if (tableMatch) {
        // Use the last (nearest) match
        const lastTable = tableMatch[tableMatch.length - 1];
        const nameMatch = lastTable.match(
          /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/i,
        );
        if (nameMatch) {
          // e.g. shop_ownership_transfers -> ownership_transfer_status
          const tableName = nameMatch[1].toLowerCase();
          // Strip common prefixes like 'shop_'
          const stripped = tableName.replace(/^shop_/, '');
          columnName = `${stripped}_status`;
        }
      }
    }

    if (!columnName.endsWith('status')) continue;
    results.push({ columnName, values });
  }
  return results;
}

/**
 * Parse all *_STATUS_LABELS constants from TypeScript file content.
 * Returns a map of entity-slug -> (value -> label).
 */
function parseStatusLabelsMap(content: string): Map<string, Map<string, string>> {
  const result = new Map<string, Map<string, string>>();
  const constRegex =
    /export\s+const\s+(\w+_STATUS_LABELS)\s*:\s*Record<[^,]+,\s*string>\s*=\s*\{([^}]+)\}/g;

  let match: RegExpExecArray | null;
  while ((match = constRegex.exec(content)) !== null) {
    const constName = match[1];
    const body = match[2];
    const slug = constName.replace(/_STATUS_LABELS$/, '').toLowerCase();

    const entryRegex = /(\w+)\s*:\s*['"]([^'"]+)['"]/g;
    const labels = new Map<string, string>();
    let entry: RegExpExecArray | null;
    while ((entry = entryRegex.exec(body)) !== null) {
      labels.set(entry[1], entry[2]);
    }
    if (labels.size > 0) {
      result.set(slug, labels);
    }
  }
  return result;
}

/**
 * Collect all *_STATUS_LABELS maps from src/features constants files.
 * Returns a nested map: entity-slug -> (value -> display label).
 */
function collectStatusLabelMaps(): Map<string, Map<string, string>> {
  const combined = new Map<string, Map<string, string>>();
  const files = walkFiles('src/features', /\.ts$/);
  const constantsFiles = files.filter((f) => /\/constants\//.test(f));

  for (const filePath of constantsFiles) {
    const content = readFile(filePath);
    const parsed = parseStatusLabelsMap(content);
    for (const [slug, labels] of parsed) {
      combined.set(slug, labels);
    }
  }
  return combined;
}

/**
 * Derive lifecycle slug from an enum name or column name.
 * e.g. listing_status -> listing, invite_status -> invite
 */
function deriveSlug(name: string): string {
  return name.replace(/_status$/, '').toLowerCase();
}

/**
 * Build LifecycleState[] from raw enum values,
 * enriched with display labels from TS constants where available.
 */
function buildStates(
  values: string[],
  labelsMap: Map<string, string> | undefined,
): LifecycleState[] {
  return values.map((value) => ({
    id: value,
    label: labelsMap?.get(value) ?? titleCase(value),
  }));
}

/**
 * Extract lifecycles from Supabase migrations and TS feature constants.
 *
 * Discovery order (deduped by slug, highest precedence first):
 *   1. CREATE TYPE ... AS ENUM where name contains 'status'  -> source: 'enum'
 *   2. CHECK (column IN (...)) where column ends with 'status' -> source: 'check_constraint'
 *   3. *_STATUS_LABELS constants not already covered above    -> source: 'typescript'
 *
 * States are enriched with TS display labels when available.
 * Transitions come from KNOWN_TRANSITIONS, else empty array.
 */
export function extractLifecycles(): Lifecycle[] {
  const migrations = readMigrationFiles();
  const labelMaps = collectStatusLabelMaps();

  const seen = new Set<string>();
  const lifecycles: Lifecycle[] = [];

  // Pass 1: ENUM types from migrations
  for (const { content } of migrations) {
    for (const { enumName, values } of parseEnumTypes(content)) {
      const slug = deriveSlug(enumName);
      if (seen.has(slug)) continue;
      seen.add(slug);

      lifecycles.push({
        slug,
        name: `${titleCase(slug)} Lifecycle`,
        description: `Status lifecycle for ${titleCase(slug).toLowerCase()} entities`,
        states: buildStates(values, labelMaps.get(slug)),
        transitions: KNOWN_TRANSITIONS[slug] ?? [],
        source: 'enum',
      });
    }
  }

  // Pass 2: CHECK constraints from migrations
  for (const { content } of migrations) {
    for (const { columnName, values } of parseCheckConstraints(content)) {
      const slug = deriveSlug(columnName);
      if (seen.has(slug)) continue;
      seen.add(slug);

      lifecycles.push({
        slug,
        name: `${titleCase(slug)} Lifecycle`,
        description: `Status lifecycle for ${titleCase(slug).toLowerCase()} entities`,
        states: buildStates(values, labelMaps.get(slug)),
        transitions: KNOWN_TRANSITIONS[slug] ?? [],
        source: 'check_constraint',
      });
    }
  }

  // Pass 3: TS constants not already discovered by migrations
  for (const [slug, labelsMap] of labelMaps) {
    if (seen.has(slug)) continue;
    seen.add(slug);

    const states = [...labelsMap.entries()].map(([id, label]) => ({ id, label }));
    lifecycles.push({
      slug,
      name: `${titleCase(slug)} Lifecycle`,
      description: `Status lifecycle for ${titleCase(slug).toLowerCase()} entities`,
      states,
      transitions: KNOWN_TRANSITIONS[slug] ?? [],
      source: 'typescript',
    });
  }

  return lifecycles;
}

// CLI entrypoint
const lifecycles = extractLifecycles();
console.log(`Found ${lifecycles.length} lifecycle(s)`);
for (const lc of lifecycles) {
  console.log(
    `  - ${lc.name} [${lc.source}]: ${lc.states.length} states, ${lc.transitions.length} transitions`,
  );
}
writeJson('lifecycles.json', { lifecycles });
