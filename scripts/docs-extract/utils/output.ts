import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const OUTPUT_DIR = join(__dir, '..', '..', '..', '_docs-output');

export function ensureOutputDir(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

export function writeJson(filename: string, data: unknown): void {
  ensureOutputDir();
  const path = join(OUTPUT_DIR, filename);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
  console.log(`  ✓ ${filename} (${JSON.stringify(data).length} bytes)`);
}
