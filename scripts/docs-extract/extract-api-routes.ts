import { walkFiles, readFile } from './utils/fs.js';
import { endpointLabel, apiGroup, titleCase } from './utils/labels.js';
import { writeJson } from './utils/output.js';
import type { ApiEndpoint, ApiGroup, RequestField } from './types.js';

/**
 * Convert a filesystem route path to an API path.
 * e.g. src/app/api/listings/[id]/route.ts → /api/listings/:id
 */
function toApiPath(filePath: string): string {
  return (
    '/' +
    filePath
      .replace(/^src\/app\//, '')
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1')
  );
}

/**
 * Detect exported HTTP methods from file contents.
 */
function detectMethods(source: string): string[] {
  const methods: string[] = [];
  const fnPattern = /export\s+(?:async\s+)?function\s+(GET|POST|PATCH|PUT|DELETE)\b/g;
  const constPattern = /export\s+const\s+(GET|POST|PATCH|PUT|DELETE)\b/g;

  let match: RegExpExecArray | null;
  while ((match = fnPattern.exec(source)) !== null) {
    if (!methods.includes(match[1])) methods.push(match[1]);
  }
  while ((match = constPattern.exec(source)) !== null) {
    if (!methods.includes(match[1])) methods.push(match[1]);
  }

  return methods;
}

/**
 * Detect auth type from file contents.
 */
function detectAuth(source: string): 'user' | 'admin' | 'none' {
  if (source.includes('createAdminClient')) return 'admin';
  if (source.includes('createServerClient') || source.includes('createClient')) return 'user';
  return 'none';
}

/**
 * Detect permission requirements from requireShopPermission calls.
 */
function detectPermissions(source: string): { feature: string; level: string } | undefined {
  const match = source.match(
    /requireShopPermission\(\s*\w+\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/,
  );
  if (match) {
    return { feature: match[1], level: match[2] };
  }
  return undefined;
}

/**
 * Detect error status codes (400+) from file contents.
 */
function detectErrorCodes(source: string): number[] {
  const codes = new Set<number>();
  const pattern = /status:\s*(\d{3})/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const code = parseInt(match[1], 10);
    if (code >= 400) codes.add(code);
  }
  return Array.from(codes).sort();
}

/**
 * Extract request body fields for a specific HTTP method handler.
 * Handles:
 *   - Zod schemas: z.object({ field: z.string(), ... })
 *   - Destructuring from req.json(): const { a, b } = await req.json()
 *   - Destructuring from body variable: body = await req.json(); const { a } = body
 */
function extractRequestFields(source: string, method: string): RequestField[] {
  const fields: RequestField[] = [];
  const seen = new Set<string>();

  // Isolate source to just the handler block for this method.
  // Slice from the start of the export declaration to the start of the next export.
  const handlerStartRe = new RegExp(
    String.raw`export\s+(?:async\s+)?function\s+` +
      method +
      String.raw`\b|export\s+const\s+` +
      method +
      String.raw`\s*=`,
  );
  const handlerMatch = handlerStartRe.exec(source);
  if (!handlerMatch) return fields;

  const afterHandler = source.slice(handlerMatch.index);
  // Find the next top-level export (for a different method) to terminate the slice
  const nextExportRe =
    /\nexport\s+(?:async\s+)?(?:function|const)\s+(?:GET|POST|PATCH|PUT|DELETE)\b/;
  const nextExportMatch = nextExportRe.exec(afterHandler.slice(1)); // skip first char to avoid re-matching same export
  const handlerSource = nextExportMatch
    ? afterHandler.slice(0, nextExportMatch.index + 1)
    : afterHandler;

  // 1. Zod schema: z.object({ ... })
  // Use 's' flag workaround: [\s\S] instead of . to match across lines
  const zodBlockRe = /z\.object\(\s*\{([\s\S]*?)\}\s*\)/g;
  let zodMatch: RegExpExecArray | null;
  while ((zodMatch = zodBlockRe.exec(handlerSource)) !== null) {
    const body = zodMatch[1];
    const fieldRe = /(\w+)\s*:\s*z\.(\w+)/g;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRe.exec(body)) !== null) {
      const name = fieldMatch[1];
      const zodType = fieldMatch[2];
      if (seen.has(name)) continue;
      seen.add(name);

      const typeMap: Record<string, string> = {
        string: 'string',
        number: 'number',
        boolean: 'boolean',
        object: 'object',
        array: 'array',
        enum: 'string',
        literal: 'string',
        union: 'unknown',
        any: 'unknown',
        unknown: 'unknown',
      };
      const type = typeMap[zodType] ?? 'unknown';

      // Check if this field has .optional() chained in the block
      const optionalRe = new RegExp(name + String.raw`\s*:\s*z\.\w+[^,}]*\.optional\(\)`);
      const required = !optionalRe.test(body);
      fields.push({ name, type, required });
    }
  }

  // 2. Destructuring fallback (only when no Zod fields found)
  if (fields.length === 0) {
    // Pattern A: const { a, b } = await req.json()
    const directRe = /const\s+\{([^}]+)\}\s*=\s*await\s+req\.json\(\)/g;
    let directMatch: RegExpExecArray | null;
    while ((directMatch = directRe.exec(handlerSource)) !== null) {
      const parts = directMatch[1].split(',');
      for (const part of parts) {
        // Handle aliasing (realName: alias) and defaults (name = default)
        const name = part.trim().split(':')[0].trim().split('=')[0].trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        fields.push({ name, type: 'unknown', required: true });
      }
    }

    // Pattern B: const bodyVar = await req.json(); const { a, b } = bodyVar
    if (fields.length === 0) {
      const bodyVarRe = /(?:const|let)\s+(\w+)\s*=\s*await\s+req\.json\(\)/;
      const bodyVarMatch = bodyVarRe.exec(handlerSource);
      if (bodyVarMatch) {
        const bodyVar = bodyVarMatch[1];
        const bodyDestructRe = new RegExp(
          String.raw`const\s+\{([^}]+)\}\s*=\s*` + bodyVar + String.raw`\b`,
          'g',
        );
        let bdMatch: RegExpExecArray | null;
        while ((bdMatch = bodyDestructRe.exec(handlerSource)) !== null) {
          const parts = bdMatch[1].split(',');
          for (const part of parts) {
            const name = part.trim().split(':')[0].trim().split('=')[0].trim();
            if (!name || seen.has(name)) continue;
            seen.add(name);
            fields.push({ name, type: 'unknown', required: true });
          }
        }
      }
    }
  }

  return fields;
}

/**
 * Extract a description for a specific HTTP method handler.
 * Checks for a JSDoc block comment or single-line comment immediately
 * above the export statement for this method.
 */
function extractDescription(source: string, method: string): string {
  const exportRe = new RegExp(
    String.raw`export\s+(?:async\s+)?function\s+` +
      method +
      String.raw`\b|export\s+const\s+` +
      method +
      String.raw`\s*=`,
  );
  const exportMatch = exportRe.exec(source);
  if (!exportMatch) return '';

  const before = source.slice(0, exportMatch.index);

  // JSDoc block comment ending just before the export
  const jsdocRe = /\/\*\*([\s\S]*?)\*\/\s*$/;
  const jsdocMatch = jsdocRe.exec(before);
  if (jsdocMatch) {
    return jsdocMatch[1]
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .filter(Boolean)
      .join(' ');
  }

  // Single-line comment on the line immediately before the export
  const singleLineRe = /\/\/\s*(.+)\s*$/;
  const singleLineMatch = singleLineRe.exec(before.trimEnd());
  if (singleLineMatch) {
    return singleLineMatch[1].trim();
  }

  return '';
}

/**
 * Detect special endpoint tags from file contents and path.
 */
function detectTags(source: string, path: string): string[] {
  const tags: string[] = [];

  if (/\.formData\(\)/.test(source)) {
    tags.push('file-upload');
  }
  if (/ReadableStream|new\s+Response\s*\([\s\S]*?stream/.test(source)) {
    tags.push('streaming');
  }
  if (/createAdminClient/.test(source)) {
    tags.push('admin-only');
  }
  if (path.includes('webhook')) {
    tags.push('webhook');
  }

  return tags;
}

/**
 * Extract all API route endpoints and group them.
 */
export function extractApiRoutes(): ApiGroup[] {
  const files = walkFiles('src/app/api', /^route\.ts$/);
  const grouped = new Map<string, ApiEndpoint[]>();

  for (const file of files) {
    // Skip test files
    if (file.includes('__tests__')) continue;

    const source = readFile(file);
    const path = toApiPath(file);
    const methods = detectMethods(source);
    const auth = detectAuth(source);
    const permissions = detectPermissions(source);
    const errorCodes = detectErrorCodes(source);
    const tags = detectTags(source, path);
    const group = apiGroup(path);

    if (!grouped.has(group)) {
      grouped.set(group, []);
    }

    for (const method of methods) {
      const requestFields = extractRequestFields(source, method);
      const description = extractDescription(source, method);

      const endpoint: ApiEndpoint = {
        method,
        path,
        label: endpointLabel(method, path),
        auth,
        errorCodes,
        requestFields,
        description,
        tags,
      };
      if (permissions) {
        endpoint.permissions = permissions;
      }
      grouped.get(group)!.push(endpoint);
    }
  }

  const groups: ApiGroup[] = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, endpoints]) => ({
      name: titleCase(name),
      endpoints,
    }));

  return groups;
}

// CLI entrypoint
const groups = extractApiRoutes();
const totalEndpoints = groups.reduce((sum, g) => sum + g.endpoints.length, 0);
console.log(`Found ${totalEndpoints} endpoints in ${groups.length} groups`);
writeJson('api-contracts.json', groups);
