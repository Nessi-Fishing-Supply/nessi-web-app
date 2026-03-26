export function titleCase(str: string): string {
  return str.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function singularize(word: string): string {
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function endpointLabel(method: string, path: string): string {
  const segments = path
    .replace(/^\/api\//, '')
    .split('/')
    .filter(Boolean);
  const hasIdParam = segments.some((s) => s.startsWith('['));
  const resourceSegments = segments.filter((s) => !s.startsWith('['));
  const resource = resourceSegments[resourceSegments.length - 1] || 'Resource';
  const lastSegment = segments[segments.length - 1];
  const isSubAction = !lastSegment.startsWith('[') && resourceSegments.length > 1;
  const resourceLabel = titleCase(singularize(resource));

  if (isSubAction && method !== 'GET') {
    const action = titleCase(lastSegment);
    const parentResource = titleCase(
      singularize(resourceSegments[resourceSegments.length - 2] || ''),
    );
    return `${action} ${parentResource}`;
  }

  const verbs: Record<string, string> = {
    GET: hasIdParam ? 'Get' : 'List',
    POST: 'Create',
    PATCH: 'Update',
    PUT: 'Update',
    DELETE: 'Delete',
  };

  return `${verbs[method] || method} ${resourceLabel}`;
}

export function apiGroup(path: string): string {
  const segments = path.replace(/^\/api\//, '').split('/');
  return segments[0] || 'other';
}
