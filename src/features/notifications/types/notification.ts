export type NotificationType =
  | 'new_message'
  | 'offer_received'
  | 'offer_accepted'
  | 'offer_declined'
  | 'offer_expired'
  | 'item_sold'
  | 'order_shipped'
  | 'order_delivered'
  | 'review_received'
  | 'price_drop'
  | 'listing_watched';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert {
  user_id: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
  link?: string | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
}
