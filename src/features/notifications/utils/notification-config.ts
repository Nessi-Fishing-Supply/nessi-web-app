import {
  HiChat,
  HiTag,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiShoppingBag,
  HiTruck,
  HiStar,
  HiTrendingDown,
  HiEye,
} from 'react-icons/hi';
import type { NotificationType } from '@/features/notifications/types/notification';

interface NotificationConfig {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  label: string;
  colorClass: string;
}

const notificationConfig: Record<NotificationType, NotificationConfig> = {
  new_message: { Icon: HiChat, label: 'Message', colorClass: 'message' },
  offer_received: { Icon: HiTag, label: 'Offer', colorClass: 'offer' },
  offer_accepted: { Icon: HiCheckCircle, label: 'Offer accepted', colorClass: 'offerAccepted' },
  offer_declined: { Icon: HiXCircle, label: 'Offer declined', colorClass: 'offerDeclined' },
  offer_expired: { Icon: HiClock, label: 'Offer expired', colorClass: 'offerExpired' },
  item_sold: { Icon: HiShoppingBag, label: 'Sale', colorClass: 'sale' },
  order_shipped: { Icon: HiTruck, label: 'Order shipped', colorClass: 'orderShipped' },
  order_delivered: { Icon: HiCheckCircle, label: 'Order delivered', colorClass: 'orderDelivered' },
  review_received: { Icon: HiStar, label: 'Review', colorClass: 'review' },
  price_drop: { Icon: HiTrendingDown, label: 'Price drop', colorClass: 'priceDrop' },
  listing_watched: { Icon: HiEye, label: 'Listing watched', colorClass: 'listingWatched' },
};

export function getNotificationConfig(type: NotificationType): NotificationConfig {
  return notificationConfig[type];
}
