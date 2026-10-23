import {
  scanText,
  EXPLICIT_BLOCKLIST,
  NUDGE_OFF_PLATFORM,
  NUDGE_NEGOTIATION,
} from '@/libs/moderation';
import type { TextScanAction, TextScanResult } from '@/libs/moderation';

// Backward-compatible type aliases
export type FilterAction = TextScanAction;
export type FilterResult = TextScanResult;

// Re-export constants
export { EXPLICIT_BLOCKLIST, NUDGE_OFF_PLATFORM, NUDGE_NEGOTIATION };

// Backward-compatible wrapper — delegates to centralized scanText with 'message' context
export function filterMessageContent(content: string): TextScanResult {
  return scanText(content, 'message');
}
