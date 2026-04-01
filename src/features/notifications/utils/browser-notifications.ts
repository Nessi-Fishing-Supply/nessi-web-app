export function requestNotificationPermission(): Promise<NotificationPermission | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve(null);
  }

  return Notification.requestPermission();
}

export function showBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, { body });
  } catch {
    // Silently fail if the Notification constructor throws
  }
}
