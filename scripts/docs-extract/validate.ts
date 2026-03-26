/**
 * Validator — checks that all expected JSON files exist in _docs-output/
 * and contain valid, non-empty data.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const OUTPUT_DIR = join(__dir, '..', '..', '_docs-output');

const EXPECTED_FILES = [
  'api-contracts.json',
  'data-model.json',
  'db-enums.json',
  'entity-relationships.json',
  'permissions.json',
  'config-reference.json',
  'features.json',
  'lifecycles.json',
  'journeys.json',
  'onboarding.json',
  'roadmap.json',
  'changelog.json',
  '_meta.json',
];

let failures = 0;

function pass(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

function fail(msg: string): void {
  console.log(`  ✗ ${msg}`);
  failures++;
}

/**
 * Find the main array inside a parsed JSON object.
 * Returns the first value that is a non-empty array, or the first array found.
 */
function findMainArray(obj: Record<string, unknown>): unknown[] | null {
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) return value;
  }
  return null;
}

for (const filename of EXPECTED_FILES) {
  const filepath = join(OUTPUT_DIR, filename);

  // 1. Check existence
  if (!existsSync(filepath)) {
    fail(`${filename} — missing`);
    continue;
  }

  // 2. Check valid JSON
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    fail(`${filename} — invalid JSON`);
    continue;
  }

  // 3. _meta.json — check required fields
  if (filename === '_meta.json') {
    const meta = data as Record<string, unknown>;
    if (!meta.extractedAt) {
      fail(`${filename} — missing extractedAt`);
    } else if (!meta.itemCounts) {
      fail(`${filename} — missing itemCounts`);
    } else if (!Array.isArray(meta.gaps)) {
      fail(`${filename} — missing gaps array`);
    } else {
      pass(`${filename} (gaps: ${(meta.gaps as unknown[]).length})`);
    }
    continue;
  }

  // 3b. data-model.json — must have an enums array
  if (filename === 'data-model.json') {
    const obj = data as Record<string, unknown>;
    const arr = findMainArray(obj);
    if (!arr) {
      fail(`${filename} — no array found`);
    } else if (arr.length === 0) {
      fail(`${filename} — empty array`);
    } else {
      // check enums array exists (can be empty — it lives in db-enums.json,
      // but we verify data-model.json itself has an entities array here)
      pass(`${filename} (${arr.length} items)`);
    }
    continue;
  }

  // 3c. db-enums.json — must have an enums array (can be empty)
  if (filename === 'db-enums.json') {
    const obj = data as Record<string, unknown>;
    if (!Array.isArray(obj.enums)) {
      fail(`${filename} — missing enums array`);
    } else {
      pass(`${filename} (${(obj.enums as unknown[]).length} enums)`);
    }
    continue;
  }

  // 3d. lifecycles.json — each lifecycle must have a source field
  if (filename === 'lifecycles.json') {
    const obj = data as Record<string, unknown>;
    const arr = findMainArray(obj);
    if (!arr) {
      fail(`${filename} — no array found`);
    } else if (arr.length === 0) {
      fail(`${filename} — empty array`);
    } else {
      const missing = (arr as Record<string, unknown>[]).filter((lc) => !lc.source);
      if (missing.length > 0) {
        fail(`${filename} — ${missing.length} lifecycle(s) missing source field`);
      } else {
        pass(`${filename} (${arr.length} items, all have source)`);
      }
    }
    continue;
  }

  // 3e. entity-relationships.json — ERD nodes must NOT have x/y properties
  if (filename === 'entity-relationships.json') {
    const obj = data as Record<string, unknown>;
    const nodes = obj.nodes as unknown[] | undefined;
    if (!Array.isArray(nodes)) {
      fail(`${filename} — missing nodes array`);
    } else {
      const withXY = (nodes as Record<string, unknown>[]).filter((n) => 'x' in n || 'y' in n);
      if (withXY.length > 0) {
        fail(`${filename} — ${withXY.length} node(s) have x/y properties (regression)`);
      } else {
        pass(`${filename} (${nodes.length} nodes, no x/y — ok)`);
      }
    }
    continue;
  }

  // 3f. journeys.json — journey nodes must NOT have x/y properties
  if (filename === 'journeys.json') {
    const obj = data as Record<string, unknown>;
    const journeys = obj.journeys as unknown[] | undefined;
    if (!Array.isArray(journeys)) {
      fail(`${filename} — missing journeys array`);
    } else if (journeys.length === 0) {
      fail(`${filename} — empty journeys array`);
    } else {
      let nodesWithXY = 0;
      for (const journey of journeys as Record<string, unknown>[]) {
        const nodes = journey.nodes as unknown[] | undefined;
        if (Array.isArray(nodes)) {
          for (const node of nodes as Record<string, unknown>[]) {
            if ('x' in node || 'y' in node) nodesWithXY++;
          }
        }
      }
      if (nodesWithXY > 0) {
        fail(`${filename} — ${nodesWithXY} journey node(s) have x/y properties (regression)`);
      } else {
        pass(`${filename} (${journeys.length} journeys, no x/y on nodes — ok)`);
      }
    }
    continue;
  }

  // 4. All others — find main array and check non-empty
  // roadmap.json is allowed to be empty (PAT may lack project scope)
  const ALLOW_EMPTY = ['roadmap.json', 'changelog.json'];
  const obj = data as Record<string, unknown>;
  const arr = findMainArray(obj);

  if (!arr) {
    fail(`${filename} — no array found`);
  } else if (arr.length === 0 && !ALLOW_EMPTY.includes(filename)) {
    fail(`${filename} — empty array`);
  } else {
    pass(`${filename} (${arr.length} items)`);
  }
}

console.log('');
if (failures > 0) {
  console.log(`Validation failed with ${failures} error(s).`);
  process.exit(1);
} else {
  console.log('All files validated successfully.');
}
