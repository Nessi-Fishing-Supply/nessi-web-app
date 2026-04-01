import type { NotificationType } from '@/features/notifications/types/notification';

/**
 * Fire-and-forget notification dispatcher for use in API routes.
 * Dynamically imports the server service to avoid loading notification modules on every request.
 * Silently catches all errors — notifications must never break the parent operation.
 */
export function dispatchNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  link?: string;
}): void {
  void (async () => {
    try {
      const { createNotificationServer } = await import(
        '@/features/notifications/services/notifications-server'
      );
      await createNotificationServer(params.userId, params.type, {
        title: params.title,
        body: params.body ?? null,
        data: params.data ?? null,
        link: params.link ?? null,
      });
    } catch (err) {
      console.error('[notification-dispatch] failed:', err);
    }
  })();
}
