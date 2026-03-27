/**
 * Extract database schema from Supabase-generated types and migrations.
 *
 * Reads `src/types/database.ts` to parse table definitions (Row blocks),
 * then walks `supabase/migrations/*.sql` to extract:
 *   - Enum types and their values
 *   - RLS policies (with operation + expressions)
 *   - Indexes (with unique flag and columns)
 *   - Trigger details (name, event, timing, function)
 *   - FK cascade behavior
 *   - PK / UNIQUE field markers
 *   - Column defaults
 *
 * Outputs entities (tables with enriched fields/badges) and an ERD
 * (nodes + edges, no x/y coordinates).
 */

import { readFile, walkFiles } from './utils/fs.js';
import { titleCase } from './utils/labels.js';
import { writeJson } from './utils/output.js';
import type { Entity, EntityField, ErdNode, ErdEdge } from './types.js';

// ---------------------------------------------------------------------------
// Table name aliases: migrations may reference old names (profiles -> members,
// products -> listings, product_images -> listing_photos)
// ---------------------------------------------------------------------------
const TABLE_ALIASES: Record<string, string> = {
  profiles: 'members',
  products: 'listings',
  product_images: 'listing_photos',
};

// ---------------------------------------------------------------------------
// Extended types
// ---------------------------------------------------------------------------

export interface EnumDef {
  name: string;
  values: string[];
}

export interface RlsPolicy {
  name: string;
  operation: string;
  using?: string;
  withCheck?: string;
}

export interface IndexDef {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface TriggerDef {
  name: string;
  event: string;
  timing: string;
  function: string;
}

// Augmented EntityField with PK, unique, default, and references.onDelete
export interface EnrichedEntityField extends EntityField {
  isPrimaryKey?: boolean;
  isUnique?: boolean;
  default?: string;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
  };
}

export interface EnrichedEntity extends Omit<Entity, 'fields'> {
  fields: EnrichedEntityField[];
  rlsPolicies: RlsPolicy[];
  indexes: IndexDef[];
  triggers: TriggerDef[];
}

// ---------------------------------------------------------------------------
// Parse database.ts
// ---------------------------------------------------------------------------

interface ParsedRelationship {
  columns: string[];
  referencedRelation: string;
}

interface ParsedTable {
  name: string;
  fields: EntityField[];
  relationships: ParsedRelationship[];
}

function parseTables(source: string): ParsedTable[] {
  const tables: ParsedTable[] = [];

  // Scope to the `public: { Tables: { ... } }` block only.
  // database.ts contains multiple schema blocks (graphql_public, public, etc.)
  // and we only want tables from the public schema.
  const publicMatch = source.match(/^\s{2}public:\s*\{/m);
  if (!publicMatch || publicMatch.index === undefined) return tables;

  const publicStart = publicMatch.index;

  // Find the Tables block within the public schema
  const afterPublic = source.slice(publicStart);
  const tablesMatch = afterPublic.match(/Tables:\s*\{/);
  if (!tablesMatch || tablesMatch.index === undefined) return tables;

  const tablesBlockStart = publicStart + tablesMatch.index + tablesMatch[0].length;

  // Find the closing brace of the Tables block (balanced braces)
  let depth = 1;
  let pos = tablesBlockStart;
  while (depth > 0 && pos < source.length) {
    if (source[pos] === '{') depth++;
    if (source[pos] === '}') depth--;
    pos++;
  }
  const tablesBlockEnd = pos;

  // Walk through each table definition within the scoped block
  const tablePattern = /^      (\w+):\s*\{$/gm;
  let match: RegExpExecArray | null;

  while ((match = tablePattern.exec(source)) !== null) {
    // Skip tables outside the public.Tables block
    if (match.index < tablesBlockStart || match.index >= tablesBlockEnd) continue;

    const tableName = match[1];
    const tableStart = match.index;

    // Find the Row block for this table
    const afterTable = source.slice(tableStart);
    const rowMatch = afterTable.match(/Row:\s*\{/);
    if (!rowMatch || rowMatch.index === undefined) continue;

    const rowStart = tableStart + rowMatch.index + rowMatch[0].length;

    // Find the closing brace of Row (matching nesting)
    let rowDepth = 1;
    let rowPos = rowStart;
    while (rowDepth > 0 && rowPos < source.length) {
      if (source[rowPos] === '{') rowDepth++;
      if (source[rowPos] === '}') rowDepth--;
      rowPos++;
    }

    const rowBody = source.slice(rowStart, rowPos - 1);
    const fields = parseRowFields(rowBody);

    // Find the Relationships block
    const relationships = parseRelationships(afterTable);

    tables.push({ name: tableName, fields, relationships });
  }

  return tables;
}

function parseRowFields(body: string): EntityField[] {
  const fields: EntityField[] = [];
  const lines = body.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;

    // Match: field_name: type
    const fieldMatch = trimmed.match(/^(\w+):\s*(.+?)$/);
    if (!fieldMatch) continue;

    const name = fieldMatch[1];
    let rawType = fieldMatch[2];

    // Clean up trailing semicolons, commas
    rawType = rawType.replace(/[;,]\s*$/, '').trim();

    // Determine nullable
    const nullable = rawType.includes('| null');

    // Clean up type for display
    let type = rawType.replace(/\s*\|\s*null/g, '').trim();

    // Simplify Database["public"]["Enums"]["..."] or Database['public']['Enums']['...']
    type = type.replace(/Database\[['"]public['"]\]\[['"]Enums['"]\]\[['"](\w+)['"]\]/g, 'enum:$1');

    fields.push({ name, type, nullable });
  }

  return fields;
}

function parseRelationships(tableBlock: string): ParsedRelationship[] {
  const relationships: ParsedRelationship[] = [];

  // Find Relationships array
  const relMatch = tableBlock.match(/Relationships:\s*\[/);
  if (!relMatch || relMatch.index === undefined) return relationships;

  const relStart = relMatch.index + relMatch[0].length;

  // Find closing bracket
  let depth = 1;
  let pos = relStart;
  while (depth > 0 && pos < tableBlock.length) {
    if (tableBlock[pos] === '[') depth++;
    if (tableBlock[pos] === ']') depth--;
    pos++;
  }

  const relBody = tableBlock.slice(relStart, pos - 1);

  // Extract each relationship object - handle both orderings of columns/referencedRelation
  const objPattern =
    /\{[^}]*referencedRelation:\s*['"](\w+)['"][^}]*columns:\s*\[([^\]]*)\][^}]*\}|\{[^}]*columns:\s*\[([^\]]*)\][^}]*referencedRelation:\s*['"](\w+)['"][^}]*\}/g;
  let relObjMatch: RegExpExecArray | null;

  while ((relObjMatch = objPattern.exec(relBody)) !== null) {
    const referencedRelation = relObjMatch[1] || relObjMatch[4];
    const columnsStr = relObjMatch[2] || relObjMatch[3];
    const columns = columnsStr
      .split(',')
      .map((c) => c.trim().replace(/['"]/g, ''))
      .filter(Boolean);

    if (referencedRelation && columns.length > 0) {
      relationships.push({ columns, referencedRelation });
    }
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Migration scanning — enriched extraction
// ---------------------------------------------------------------------------

interface MigrationData {
  rls: Set<string>;
  triggers: Set<string>;
  enums: EnumDef[];
  rlsPoliciesByTable: Record<string, RlsPolicy[]>;
  indexesByTable: Record<string, IndexDef[]>;
  triggersByTable: Record<string, TriggerDef[]>;
  pkByTable: Record<string, Set<string>>;
  uniqueByTable: Record<string, Set<string>>;
  defaultsByTable: Record<string, Record<string, string>>;
  fkCascadeByTable: Record<string, Record<string, string>>;
}

function scanMigrations(tableNames: string[]): MigrationData {
  const rls = new Set<string>();
  const triggers = new Set<string>();
  const enums: EnumDef[] = [];
  const enumNames = new Set<string>();
  const rlsPoliciesByTable: Record<string, RlsPolicy[]> = {};
  const indexesByTable: Record<string, IndexDef[]> = {};
  const triggersByTable: Record<string, TriggerDef[]> = {};
  const pkByTable: Record<string, Set<string>> = {};
  const uniqueByTable: Record<string, Set<string>> = {};
  const defaultsByTable: Record<string, Record<string, string>> = {};
  const fkCascadeByTable: Record<string, Record<string, string>> = {};

  const migrationFiles = walkFiles('supabase/migrations', /\.sql$/);

  for (const filePath of migrationFiles) {
    const content = readFile(filePath);

    // -------------------------------------------------------------------------
    // 1. Enum extraction
    // Parse: CREATE TYPE name AS ENUM (...) — both bare and inside DO $$ BEGIN blocks
    // -------------------------------------------------------------------------
    const enumPattern = /CREATE\s+TYPE\s+(?:public\.)?(\w+)\s+AS\s+ENUM\s*\(([^)]+)\)/gi;
    let enumMatch: RegExpExecArray | null;
    while ((enumMatch = enumPattern.exec(content)) !== null) {
      const enumName = enumMatch[1];
      if (enumNames.has(enumName)) continue;
      enumNames.add(enumName);
      const valuesRaw = enumMatch[2];
      const values = valuesRaw
        .split(',')
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      enums.push({ name: enumName, values });
    }

    // -------------------------------------------------------------------------
    // 2. RLS badge (ENABLE ROW LEVEL SECURITY)
    // -------------------------------------------------------------------------
    const lines = content.split('\n');
    for (const line of lines) {
      if (/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(line)) {
        const tableMatch = line.match(/ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ENABLE/i);
        if (tableMatch) {
          const rawName = tableMatch[1];
          const resolved = TABLE_ALIASES[rawName] ?? rawName;
          if (tableNames.includes(resolved)) {
            rls.add(resolved);
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 3. RLS policy extraction
    // Pattern:
    //   CREATE POLICY "name"
    //     ON table FOR operation
    //     [TO role]
    //     [USING (expr)]
    //     [WITH CHECK (expr)];
    // -------------------------------------------------------------------------
    const normalised = content.replace(/\r\n/g, '\n');

    // Match CREATE POLICY blocks — capture up to the semicolon
    const policyPattern =
      /CREATE\s+POLICY\s+["']([^"']+)["']\s+ON\s+(?:public\.)?(\w+)\s+FOR\s+(\w+)([\s\S]*?)(?=;)/gi;
    let policyMatch: RegExpExecArray | null;
    while ((policyMatch = policyPattern.exec(normalised)) !== null) {
      const policyName = policyMatch[1];
      const rawTableName = policyMatch[2];
      const operation = policyMatch[3].toUpperCase();
      const body = policyMatch[4];

      const resolvedTable = TABLE_ALIASES[rawTableName] ?? rawTableName;
      if (!tableNames.includes(resolvedTable)) continue;

      // Extract USING expression (balanced parens after USING keyword)
      const usingExpr = extractParenExpr(body, /\bUSING\s*\(/i);
      // Extract WITH CHECK expression
      const withCheckExpr = extractParenExpr(body, /\bWITH\s+CHECK\s*\(/i);

      const policy: RlsPolicy = { name: policyName, operation };
      if (usingExpr !== undefined) policy.using = usingExpr;
      if (withCheckExpr !== undefined) policy.withCheck = withCheckExpr;

      if (!rlsPoliciesByTable[resolvedTable]) {
        rlsPoliciesByTable[resolvedTable] = [];
      }
      rlsPoliciesByTable[resolvedTable].push(policy);
    }

    // -------------------------------------------------------------------------
    // 4. Index extraction
    // Pattern: CREATE [UNIQUE] INDEX [IF NOT EXISTS] name ON table (columns)
    // -------------------------------------------------------------------------
    const indexPattern =
      /CREATE\s+(UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s+ON\s+(?:public\.)?(\w+)\s*(?:USING\s+\w+\s*)?\(([^)]+)\)/gi;
    let indexMatch: RegExpExecArray | null;
    while ((indexMatch = indexPattern.exec(content)) !== null) {
      const isUnique = Boolean(indexMatch[1]);
      const indexName = indexMatch[2];
      const rawTableName = indexMatch[3];
      const columnsRaw = indexMatch[4];

      const resolvedTable = TABLE_ALIASES[rawTableName] ?? rawTableName;
      if (!tableNames.includes(resolvedTable)) continue;

      // Parse column list — strip ops (gin_trgm_ops etc.)
      const columns = columnsRaw
        .split(',')
        .map((c) => {
          return c.trim().split(/\s+/)[0].replace(/[()]/g, '').trim();
        })
        .filter(Boolean);

      if (!indexesByTable[resolvedTable]) {
        indexesByTable[resolvedTable] = [];
      }
      indexesByTable[resolvedTable].push({ name: indexName, columns, unique: isUnique });

      // Track unique single-column indexes for field-level isUnique
      if (isUnique && columns.length === 1) {
        if (!uniqueByTable[resolvedTable]) uniqueByTable[resolvedTable] = new Set();
        uniqueByTable[resolvedTable].add(columns[0]);
      }
    }

    // -------------------------------------------------------------------------
    // 5. Trigger extraction (badge + detail)
    // Pattern: CREATE TRIGGER name BEFORE|AFTER event ON table EXECUTE FUNCTION func
    // -------------------------------------------------------------------------
    const triggerPattern =
      /CREATE\s+TRIGGER\s+(\w+)\s+(BEFORE|AFTER)\s+([\w\s]+?)\s+ON\s+(?:public\.)?(\w+)[\s\S]*?EXECUTE\s+FUNCTION\s+([\w.]+)\s*\(\)/gi;
    let triggerBlockMatch: RegExpExecArray | null;
    while ((triggerBlockMatch = triggerPattern.exec(content)) !== null) {
      const triggerName = triggerBlockMatch[1];
      const timing = triggerBlockMatch[2].toUpperCase();
      const event = triggerBlockMatch[3].trim().toUpperCase();
      const rawTableName = triggerBlockMatch[4];
      const func = triggerBlockMatch[5];

      const resolvedTable = TABLE_ALIASES[rawTableName] ?? rawTableName;
      if (tableNames.includes(resolvedTable)) {
        triggers.add(resolvedTable);

        if (!triggersByTable[resolvedTable]) {
          triggersByTable[resolvedTable] = [];
        }
        triggersByTable[resolvedTable].push({
          name: triggerName,
          event,
          timing,
          function: func,
        });
      }
    }

    // -------------------------------------------------------------------------
    // 6. PK/UNIQUE/DEFAULT/FK detection from CREATE TABLE blocks
    // -------------------------------------------------------------------------
    const createTablePattern =
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
    let ctMatch: RegExpExecArray | null;
    while ((ctMatch = createTablePattern.exec(content)) !== null) {
      const rawTableName = ctMatch[1];
      const tableBody = ctMatch[2];
      const resolvedTable = TABLE_ALIASES[rawTableName] ?? rawTableName;
      if (!tableNames.includes(resolvedTable)) continue;

      const colLines = tableBody.split('\n');
      for (const colLine of colLines) {
        const trimmedCol = colLine.trim();
        if (!trimmedCol || trimmedCol.startsWith('--') || trimmedCol.startsWith('CONSTRAINT'))
          continue;

        const colNameMatch = trimmedCol.match(/^(\w+)\s+/);
        if (!colNameMatch) continue;
        const colName = colNameMatch[1];

        if (/\bPRIMARY\s+KEY\b/i.test(trimmedCol)) {
          if (!pkByTable[resolvedTable]) pkByTable[resolvedTable] = new Set();
          pkByTable[resolvedTable].add(colName);
        }

        if (/\bUNIQUE\b/i.test(trimmedCol)) {
          if (!uniqueByTable[resolvedTable]) uniqueByTable[resolvedTable] = new Set();
          uniqueByTable[resolvedTable].add(colName);
        }

        const defaultMatch = trimmedCol.match(/\bDEFAULT\s+(.+?)(?:\s*,\s*$|\s*$)/i);
        if (defaultMatch) {
          if (!defaultsByTable[resolvedTable]) defaultsByTable[resolvedTable] = {};
          const defaultVal = defaultMatch[1].replace(/,\s*$/, '').trim();
          defaultsByTable[resolvedTable][colName] = defaultVal;
        }

        // Inline FK reference — capture ON DELETE behaviour
        const fkMatch = trimmedCol.match(
          /REFERENCES\s+(?:public\.)?(\w+)\s*\(\s*(\w+)\s*\)(?:\s+ON\s+DELETE\s+(\w+(?:\s+\w+)?))?/i,
        );
        if (fkMatch) {
          const onDelete = fkMatch[3]?.toUpperCase();
          if (onDelete) {
            if (!fkCascadeByTable[resolvedTable]) fkCascadeByTable[resolvedTable] = {};
            fkCascadeByTable[resolvedTable][colName] = onDelete;
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 7. ALTER TABLE ADD CONSTRAINT ... FOREIGN KEY with ON DELETE
    // -------------------------------------------------------------------------
    const alterFkPattern =
      /ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+ADD\s+CONSTRAINT\s+\w+\s+FOREIGN\s+KEY\s*\(\s*(\w+)\s*\)\s+REFERENCES\s+(?:public\.)?(\w+)\s*\(\s*(\w+)\s*\)\s+ON\s+DELETE\s+(\w+(?:\s+\w+)?)/gi;
    let afkMatch: RegExpExecArray | null;
    while ((afkMatch = alterFkPattern.exec(content)) !== null) {
      const rawTableName = afkMatch[1];
      const colName = afkMatch[2];
      const onDelete = afkMatch[5].toUpperCase();
      const resolvedTable = TABLE_ALIASES[rawTableName] ?? rawTableName;
      if (!tableNames.includes(resolvedTable)) continue;
      if (!fkCascadeByTable[resolvedTable]) fkCascadeByTable[resolvedTable] = {};
      fkCascadeByTable[resolvedTable][colName] = onDelete;
    }
  }

  return {
    rls,
    triggers,
    enums,
    rlsPoliciesByTable,
    indexesByTable,
    triggersByTable,
    pkByTable,
    uniqueByTable,
    defaultsByTable,
    fkCascadeByTable,
  };
}

/**
 * Extract the content of a balanced-paren expression immediately following a
 * pattern like USING( or WITH CHECK(. Returns undefined if not found.
 */
function extractParenExpr(text: string, startPattern: RegExp): string | undefined {
  const m = startPattern.exec(text);
  if (!m) return undefined;

  // Start after the opening paren (the pattern captures the '(')
  let depth = 1;
  let i = m.index + m[0].length;
  const start = i;

  while (i < text.length && depth > 0) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
    i++;
  }

  return text.slice(start, i - 1).trim();
}

// ---------------------------------------------------------------------------
// Build entities
// ---------------------------------------------------------------------------

function buildEntities(tables: ParsedTable[], migData: MigrationData): EnrichedEntity[] {
  return tables.map((table) => {
    const badges: string[] = [];
    if (migData.rls.has(table.name)) badges.push('RLS');
    if (migData.triggers.has(table.name)) badges.push('Triggers');

    const pkSet = migData.pkByTable[table.name] ?? new Set<string>();
    const uniqueSet = migData.uniqueByTable[table.name] ?? new Set<string>();
    const defaults = migData.defaultsByTable[table.name] ?? {};
    const fkCascade = migData.fkCascadeByTable[table.name] ?? {};

    const enrichedFields: EnrichedEntityField[] = table.fields.map((field) => {
      const ef: EnrichedEntityField = { ...field };

      if (pkSet.has(field.name)) ef.isPrimaryKey = true;
      if (uniqueSet.has(field.name)) ef.isUnique = true;
      if (defaults[field.name] !== undefined) ef.default = defaults[field.name];

      if (fkCascade[field.name]) {
        ef.references = { table: '', column: '', onDelete: fkCascade[field.name] };
      }

      return ef;
    });

    // Attach references table/column from parsed relationships
    for (const rel of table.relationships) {
      for (const col of rel.columns) {
        const field = enrichedFields.find((f) => f.name === col);
        if (field) {
          if (field.references) {
            field.references.table = rel.referencedRelation;
            field.references.column = 'id';
          } else {
            field.references = { table: rel.referencedRelation, column: 'id' };
          }
        }
      }
    }

    return {
      name: table.name,
      label: titleCase(table.name),
      fields: enrichedFields,
      badges,
      rlsPolicies: migData.rlsPoliciesByTable[table.name] ?? [],
      indexes: migData.indexesByTable[table.name] ?? [],
      triggers: migData.triggersByTable[table.name] ?? [],
    };
  });
}

// ---------------------------------------------------------------------------
// Build ERD (no x/y)
// ---------------------------------------------------------------------------

function buildErd(tables: ParsedTable[]): {
  nodes: ErdNode[];
  edges: ErdEdge[];
} {
  const tableNames = tables.map((t) => t.name);

  // Nodes: id + label only — layout coordinates computed by the rendering layer
  const nodes: ErdNode[] = tables.map((table) => ({
    id: table.name,
    label: titleCase(table.name),
  }));

  // Edges: use explicit Relationships from the type definitions
  const edges: ErdEdge[] = [];
  const edgeKeys = new Set<string>();

  for (const table of tables) {
    for (const rel of table.relationships) {
      if (tableNames.includes(rel.referencedRelation)) {
        const column = rel.columns[0];
        const key = `${table.name}->${rel.referencedRelation}:${column}`;
        if (!edgeKeys.has(key)) {
          edgeKeys.add(key);
          edges.push({
            from: table.name,
            to: rel.referencedRelation,
            label: column,
          });
        }
      }
    }
  }

  // Fallback: detect _id columns for tables without explicit relationships
  for (const table of tables) {
    if (table.relationships.length > 0) continue;

    for (const field of table.fields) {
      if (!field.name.endsWith('_id')) continue;

      const stem = field.name.replace(/_id$/, '');

      const candidates = [stem, stem + 's', stem + 'es', stem.replace(/y$/, 'ies')];

      for (const candidate of candidates) {
        if (tableNames.includes(candidate)) {
          const key = `${table.name}->${candidate}:${field.name}`;
          if (!edgeKeys.has(key)) {
            edgeKeys.add(key);
            edges.push({
              from: table.name,
              to: candidate,
              label: field.name,
            });
          }
          break;
        }
      }
    }
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function extractDatabase(): {
  entities: EnrichedEntity[];
  enums: EnumDef[];
  erd: { nodes: ErdNode[]; edges: ErdEdge[] };
} {
  const source = readFile('src/types/database.ts');
  const tables = parseTables(source);
  const tableNames = tables.map((t) => t.name);
  const migData = scanMigrations(tableNames);
  const entities = buildEntities(tables, migData);
  const erd = buildErd(tables);

  return { entities, enums: migData.enums, erd };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('extract-database.ts') ||
    process.argv[1].endsWith('extract-database.js'));

if (isMain) {
  console.log('Extracting database schema...');
  const { entities, enums, erd } = extractDatabase();

  writeJson('data-model.json', entities);
  writeJson('entity-relationships.json', erd);
  writeJson('db-enums.json', enums);

  console.log(`\n  Tables: ${entities.length}`);
  console.log(`  Enums: ${enums.length}`);
  console.log(`  With RLS: ${entities.filter((e) => e.badges.includes('RLS')).length}`);
  console.log(`  With Triggers: ${entities.filter((e) => e.badges.includes('Triggers')).length}`);
  console.log(`  ERD nodes: ${erd.nodes.length}`);
  console.log(`  ERD edges: ${erd.edges.length}`);
}
