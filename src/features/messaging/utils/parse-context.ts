export function parseMessageContext(
  request: Request,
): { type: 'member' } | { type: 'shop'; shopId: string } {
  const header = request.headers.get('X-Nessi-Context');
  if (header && header.startsWith('shop:')) {
    return { type: 'shop', shopId: header.slice('shop:'.length) };
  }
  return { type: 'member' };
}
