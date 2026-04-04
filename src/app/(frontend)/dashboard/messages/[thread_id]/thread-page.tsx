'use client';

import { useEffect, useRef, useState } from 'react';
import { useAvailableHeight } from '@/features/shared/hooks/use-available-height';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { HiChevronLeft } from 'react-icons/hi';
import { useAuth } from '@/features/auth/context';
import { useThreads } from '@/features/messaging/hooks/use-threads';
import { useThread } from '@/features/messaging/hooks/use-thread';
import { useMessages } from '@/features/messaging/hooks/use-messages';
import { useMarkRead } from '@/features/messaging/hooks/use-mark-read';
import { useRealtimeMessages } from '@/features/messaging/hooks/use-realtime-messages';
import { useTypingIndicator } from '@/features/messaging/hooks/use-typing-indicator';
import { useOffer } from '@/features/messaging/hooks/use-offer';
import { useOfferActions } from '@/features/messaging/hooks/use-offer-actions';
import { isOnline } from '@/features/messaging/hooks/use-online-status';
import type { ThreadType, ThreadWithParticipants } from '@/features/messaging/types/thread';
import Tabs from '@/components/controls/tabs';
import type { TabItem } from '@/components/controls/tabs';
import Avatar from '@/components/controls/avatar';
import ErrorState from '@/components/indicators/error-state';
import InlineBanner from '@/components/indicators/inline-banner';
import ConfirmationDialog from '@/components/layout/confirmation-dialog';
import ThreadList from '@/features/messaging/components/thread-list';
import MessageThread from '@/features/messaging/components/message-thread';
import ComposeBar from '@/features/messaging/components/compose-bar';
import TypingIndicator from '@/features/messaging/components/typing-indicator';
import OfferSheet from '@/features/messaging/components/offer-sheet';
import styles from './thread-page.module.scss';

const TAB_TYPES: (ThreadType | undefined)[] = [
  undefined,
  'inquiry',
  'offer',
  'custom_request',
  'direct',
];
const TAB_LABELS = ['All', 'Inquiries', 'Offers', 'Custom', 'Direct'];

interface ThreadPageProps {
  threadId: string;
}

export default function ThreadPage({ threadId }: ThreadPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [isOfferSheetOpen, setIsOfferSheetOpen] = useState(false);
  const [offerSheetMode, setOfferSheetMode] = useState<'create' | 'counter'>('create');
  const [showNewMessagePill, setShowNewMessagePill] = useState(false);

  // Thread list data
  const activeType = TAB_TYPES[activeTabIndex];
  const { data: allThreads, isLoading: isListLoading } = useThreads();
  const threads = activeType ? allThreads?.filter((t) => t.type === activeType) : allThreads;

  const tabItems: TabItem[] = TAB_LABELS.map((label, index) => {
    const type = TAB_TYPES[index];
    const relevantThreads = type ? allThreads?.filter((t) => t.type === type) : allThreads;
    const unreadCount = relevantThreads?.reduce((sum, t) => sum + t.my_unread_count, 0) ?? 0;
    return { label, count: unreadCount > 0 ? unreadCount : undefined };
  });

  // Active thread data
  const {
    data: thread,
    isLoading: isThreadLoading,
    isError: isThreadError,
    refetch: refetchThread,
  } = useThread(threadId);

  const {
    data,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    refetch: refetchMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(threadId);

  useRealtimeMessages(threadId, user?.id ?? null);
  const { startTyping, isOtherTyping } = useTypingIndicator(threadId, user?.id ?? null);

  // Offer handling
  const latestOfferMessage = data?.pages
    .flatMap((page) => page.messages)
    .find((m) => m.type === 'offer_node' && m.metadata);
  const latestOfferId =
    latestOfferMessage?.metadata &&
    typeof latestOfferMessage.metadata === 'object' &&
    !Array.isArray(latestOfferMessage.metadata) &&
    'offer_id' in latestOfferMessage.metadata
      ? (latestOfferMessage.metadata.offer_id as string)
      : undefined;

  const isOfferThread = thread?.type === 'offer';
  const { data: offer } = useOffer(isOfferThread ? latestOfferId : undefined);
  const offerActions = useOfferActions({ offerId: latestOfferId ?? '', onSuccess: () => {} });
  const isOfferActionPending =
    offerActions.accept.isPending ||
    offerActions.decline.isPending ||
    offerActions.counter.isPending;

  // Find the message ID of the latest pending offer node for inline action buttons
  const latestPendingOfferMsgId = data?.pages
    .flatMap((page) => page.messages)
    .find(
      (m) =>
        m.type === 'offer_node' &&
        m.metadata &&
        typeof m.metadata === 'object' &&
        !Array.isArray(m.metadata) &&
        (m.metadata as Record<string, unknown>).status === 'pending',
    )?.id;

  const { ref: shellRef, height: shellHeight } = useAvailableHeight();

  // Scroll management
  const messageAreaRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef(0);
  const hasScrolledToBottomRef = useRef(false);

  useEffect(() => {
    if (messageAreaRef.current && data && !hasScrolledToBottomRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
      previousScrollHeightRef.current = messageAreaRef.current.scrollHeight;
      hasScrolledToBottomRef.current = true;
    }
  }, [data]);

  useEffect(() => {
    const container = messageAreaRef.current;
    if (!container || !data || !hasScrolledToBottomRef.current) return;
    const newScrollHeight = container.scrollHeight;
    const diff = newScrollHeight - previousScrollHeightRef.current;
    if (diff > 0 && previousScrollHeightRef.current > 0) {
      container.scrollTop += diff;
    }
    previousScrollHeightRef.current = newScrollHeight;
  }, [data]);

  // Reset scroll state when switching threads
  useEffect(() => {
    hasScrolledToBottomRef.current = false;
    previousScrollHeightRef.current = 0;
    setShowNewMessagePill(false);
  }, [threadId]);

  function isNearBottom() {
    const el = messageAreaRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }

  const latestMessageId = data?.pages[0]?.messages[0]?.id;
  useEffect(() => {
    if (!latestMessageId || !hasScrolledToBottomRef.current) return;
    if (isNearBottom()) {
      messageAreaRef.current?.scrollTo({
        top: messageAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShowNewMessagePill(false);
    } else {
      setShowNewMessagePill(true);
    }
  }, [latestMessageId]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = messageAreaRef.current;
    if (!sentinel || !container || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          previousScrollHeightRef.current = container.scrollHeight;
          fetchNextPage();
        }
      },
      { root: container, threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const markRead = useMarkRead();
  useEffect(() => {
    if (threadId) markRead.mutate(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId, latestMessageId]);

  const otherParticipant = thread?.participants.find((p) => p.member.id !== user?.id);
  const currentUserParticipant = thread?.participants.find((p) => p.member.id === user?.id);

  // Resolve display identity — shop name/avatar/link if shop context, member otherwise
  const otherDisplayName =
    otherParticipant?.context_type === 'shop' && otherParticipant.shop
      ? otherParticipant.shop.shop_name
      : otherParticipant
        ? `${otherParticipant.member.first_name} ${otherParticipant.member.last_name}`
        : 'Unknown';

  const otherDisplayAvatar =
    otherParticipant?.context_type === 'shop' && otherParticipant.shop
      ? (otherParticipant.shop.avatar_url ?? undefined)
      : (otherParticipant?.member.avatar_url ?? undefined);

  const otherProfileHref =
    otherParticipant?.context_type === 'shop' && otherParticipant.shop?.slug
      ? `/shop/${otherParticipant.shop.slug}`
      : otherParticipant?.member.slug
        ? `/member/${otherParticipant.member.slug}`
        : null;
  const currentUserRole = currentUserParticipant?.role;
  const isThreadInactive = thread?.status === 'archived' || thread?.status === 'closed';

  const handleMakeOffer = () => {
    if (isThreadInactive) return;
    setOfferSheetMode('create');
    setIsOfferSheetOpen(true);
  };

  const handleCounterOffer = () => {
    if (!offer || offer.status !== 'pending' || isThreadInactive) return;
    setOfferSheetMode('counter');
    setIsOfferSheetOpen(true);
  };

  const handleOfferCreated = (newOffer: { thread_id: string }) => {
    if (newOffer.thread_id) router.push(`/dashboard/messages/${newOffer.thread_id}`);
  };

  const listingId = thread?.listing_id ?? offer?.listing?.id ?? '';
  const listingTitle = offer?.listing?.title ?? thread?.listing?.title ?? '';
  const listingPriceCents = offer?.listing?.price_cents ?? thread?.listing?.price_cents ?? 0;
  const sellerId =
    offer?.seller?.id ?? thread?.participants.find((p) => p.role === 'seller')?.member.id ?? '';

  const messages = data
    ? data.pages
        .slice()
        .reverse()
        .flatMap((page) => [...page.messages].reverse())
    : [];

  const isEmpty = messages.length === 0;
  const isLoading = isThreadLoading || isMessagesLoading;
  const isError = isThreadError || isMessagesError;

  return (
    <div className={styles.shell} ref={shellRef} style={{ height: shellHeight }}>
      {/* ─── Left: Thread list (desktop only) ─── */}
      <div className={styles.listPanel}>
        <div className={styles.listHeader}>
          <h1 className={styles.heading}>Messages</h1>
        </div>
        <div className={styles.tabsWrap}>
          <Tabs items={tabItems} activeIndex={activeTabIndex} onChange={setActiveTabIndex} />
        </div>
        <div className={styles.listContent}>
          {isListLoading ? (
            <div className={styles.skeleton}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonRow}>
                  <div className={styles.skeletonAvatar} />
                  <div className={styles.skeletonBody}>
                    <div className={styles.skeletonLine} />
                    <div className={styles.skeletonLineShort} />
                  </div>
                </div>
              ))}
            </div>
          ) : threads && user ? (
            <ThreadList
              threads={threads}
              currentUserId={user.id}
              activeThreadId={threadId}
              basePath="/dashboard/messages"
            />
          ) : null}
        </div>
      </div>

      {/* ─── Center: Chat area ─── */}
      <div className={styles.chatPanel}>
        {/* Mobile back header */}
        <div className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => router.push('/dashboard/messages')}
            aria-label="Back to messages"
          >
            <HiChevronLeft aria-hidden="true" />
          </button>
          <div className={styles.mobileHeaderInfo}>
            {otherParticipant && (
              <>
                <Avatar
                  size="sm"
                  name={otherDisplayName}
                  imageUrl={otherDisplayAvatar}
                  isOnline={isOnline(otherParticipant.member.last_seen_at ?? null)}
                />
                <span className={styles.mobileHeaderName}>{otherDisplayName}</span>
              </>
            )}
          </div>
        </div>

        {/* Desktop chat header */}
        <div className={styles.chatHeader}>
          {otherParticipant && (
            <>
              <div className={styles.chatHeaderInner}>
                <Avatar
                  size="md"
                  name={otherDisplayName}
                  imageUrl={otherDisplayAvatar}
                  isOnline={isOnline(otherParticipant.member.last_seen_at ?? null)}
                />
                <div className={styles.chatHeaderMeta}>
                  <span className={styles.chatHeaderName}>{otherDisplayName}</span>
                  <span className={styles.chatHeaderStatus}>
                    {isOnline(otherParticipant.member.last_seen_at ?? null)
                      ? 'Active now'
                      : 'Offline'}
                  </span>
                </div>
              </div>
              {otherProfileHref && (
                <Link href={otherProfileHref} className={styles.chatHeaderProfileLink}>
                  View profile
                </Link>
              )}
            </>
          )}
        </div>

        {/* Thread context bar — listing reference + offer status */}
        {thread && (thread.listing || offer) && (
          <div className={styles.contextBar}>
            {thread.listing && (
              <Link href={`/listing/${thread.listing.id}`} className={styles.contextBarListing}>
                {thread.listing.image_url && (
                  <div className={styles.contextBarThumb}>
                    <Image
                      src={thread.listing.image_url}
                      alt={thread.listing.title}
                      fill
                      sizes="32px"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                )}
                <span className={styles.contextBarListingTitle}>{thread.listing.title}</span>
                <span className={styles.contextBarListingPrice}>
                  $
                  {(thread.listing.price_cents / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </Link>
            )}
            {offer && (
              <div className={styles.contextBarOffer}>
                <span className={styles.contextBarOfferAmount}>
                  Offer: $
                  {(offer.amount_cents / 100).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`${styles.contextBarOfferStatus} ${styles[`offerStatus_${offer.status}`] ?? ''}`}
                >
                  {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Messages area */}
        {isLoading ? (
          <div className={styles.messageArea}>
            <div className={styles.chatSkeleton} role="status">
              <span className="sr-only">Loading conversation</span>
            </div>
          </div>
        ) : isError ? (
          <div className={styles.messageArea}>
            <ErrorState
              variant="banner"
              message="Something went wrong loading this conversation"
              action={{
                label: 'Retry',
                onClick: () => {
                  refetchThread();
                  refetchMessages();
                },
              }}
            />
          </div>
        ) : (
          <div className={styles.messageArea} ref={messageAreaRef}>
            <div ref={sentinelRef} />
            {isFetchingNextPage && (
              <div className={styles.loadingMore} role="status">
                <span className="sr-only">Loading older messages</span>
                <div className={styles.spinner} aria-hidden="true" />
              </div>
            )}
            {isEmpty ? (
              <div className={styles.emptyChat}>
                <p className={styles.emptyChatText}>Send a message to get started</p>
              </div>
            ) : (
              <MessageThread
                messages={messages}
                currentUserId={user?.id ?? ''}
                otherParticipantLastReadAt={otherParticipant?.last_read_at}
                onAcceptOffer={() => offerActions.accept.mutate()}
                onDeclineOffer={() => setIsDeclineDialogOpen(true)}
                onCounterOffer={handleCounterOffer}
                isOfferActionPending={isOfferActionPending}
                latestPendingOfferId={latestPendingOfferMsgId}
                currentUserRole={currentUserRole}
              />
            )}
            {showNewMessagePill && (
              <button
                className={styles.newMessagePill}
                onClick={() => {
                  messageAreaRef.current?.scrollTo({
                    top: messageAreaRef.current.scrollHeight,
                    behavior: 'smooth',
                  });
                  setShowNewMessagePill(false);
                }}
                aria-label="Scroll to new message"
              >
                New message
              </button>
            )}
          </div>
        )}

        {isOtherTyping && (
          <TypingIndicator name={otherParticipant?.member.first_name ?? 'Someone'} />
        )}
        {isThreadInactive && (
          <div className={styles.inactiveBanner}>
            <InlineBanner
              variant="info"
              title={
                thread?.status === 'archived'
                  ? 'This conversation is archived'
                  : 'This conversation is closed'
              }
            />
          </div>
        )}
        <ComposeBar
          threadId={threadId}
          disabled={isThreadInactive}
          threadType={thread?.type}
          currentUserRole={currentUserRole}
          onMakeOffer={handleMakeOffer}
          onTyping={startTyping}
        />
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        isOpen={isDeclineDialogOpen}
        onClose={() => setIsDeclineDialogOpen(false)}
        onConfirm={() => {
          offerActions.decline.mutate();
          setIsDeclineDialogOpen(false);
        }}
        title="Decline Offer"
        message="Are you sure you want to decline this offer? This action cannot be undone."
        confirmLabel="Decline"
        variant="destructive"
      />

      {listingPriceCents > 0 && (
        <OfferSheet
          isOpen={isOfferSheetOpen}
          onClose={() => setIsOfferSheetOpen(false)}
          listingId={listingId}
          listingTitle={listingTitle}
          listingPriceCents={listingPriceCents}
          sellerId={sellerId}
          mode={offerSheetMode}
          currentOfferAmountCents={offer?.amount_cents}
          offerId={latestOfferId}
          onOfferCreated={handleOfferCreated}
        />
      )}
    </div>
  );
}
