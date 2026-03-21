import { getQueryClient } from '@/libs/query-client';
import useContextStore from '@/features/context/stores/context-store';

type RevocationResult = { revoked: true; shopName: string } | { revoked: false };

let lastRevocationTimestamp = 0;
const DEDUPLICATION_WINDOW_MS = 2000;

export function handleContextRevocation(): RevocationResult {
  const now = Date.now();
  if (now - lastRevocationTimestamp < DEDUPLICATION_WINDOW_MS) {
    return { revoked: false };
  }

  const { activeContext, switchToMember } = useContextStore.getState();

  if (activeContext.type !== 'shop') {
    return { revoked: false };
  }

  const shopName = activeContext.shopName ?? activeContext.shopId;

  lastRevocationTimestamp = now;
  switchToMember();

  const queryClient = getQueryClient();
  queryClient.cancelQueries();
  queryClient.invalidateQueries();

  window.dispatchEvent(new CustomEvent('nessi:context-revoked', { detail: { shopName } }));

  return { revoked: true, shopName };
}
