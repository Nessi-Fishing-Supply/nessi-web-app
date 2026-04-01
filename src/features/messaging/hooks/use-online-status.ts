'use client';

import { useEffect } from 'react';

const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Sends a heartbeat to keep the current user's last_seen_at fresh.
 * Call once at the app level (e.g., navbar) for authenticated users.
 */
export function useOnlineStatus(enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const sendHeartbeat = () => {
      fetch('/api/members/heartbeat', { method: 'PATCH' }).catch(() => {
        // Silently ignore — heartbeat is best-effort
      });
    };

    // Send immediately on mount
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);
}

/**
 * Pure utility — returns true if last_seen_at is within the last 5 minutes.
 */
export function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(lastSeenAt).getTime() > fiveMinutesAgo;
}
