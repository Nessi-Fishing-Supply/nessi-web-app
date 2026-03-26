import { readdirSync, readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir =
  typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dir, '..', '..', '..');

export function root(...segments: string[]): string {
  return join(ROOT, ...segments);
}

export function readFile(...segments: string[]): string {
  return readFileSync(root(...segments), 'utf-8');
}

export function walkFiles(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];
  const fullDir = root(dir);

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (pattern.test(entry.name)) {
        results.push(relative(ROOT, full));
      }
    }
  }

  walk(fullDir);
  return results.sort();
}

export function listDirs(dir: string): string[] {
  const fullDir = root(dir);
  return readdirSync(fullDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}
