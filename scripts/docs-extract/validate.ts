/**
 * Validator — checks that all expected JSON files exist in _docs-output/
 * and contain valid, non-empty data.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir =
  typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url));

const OUTPUT_DIR = join(__dir, '..', '..', '_docs-output');

const EXPECTED_FILES = [
  'api-contracts.json',
  'data-model.json',
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
    } else {
      pass(`${filename}`);
    }
    continue;
  }

  // 4. All others — find main array and check non-empty
  // roadmap.json is allowed to be empty (PAT may lack project scope)
  const ALLOW_EMPTY = ['roadmap.json'];
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
