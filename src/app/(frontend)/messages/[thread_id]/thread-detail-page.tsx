'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context';
import { useThread } from '@/features/messaging/hooks/use-thread';
import { useMessages } from '@/features/messaging/hooks/use-messages';
import { useMarkRead } from '@/features/messaging/hooks/use-mark-read';
import { useOffer } from '@/features/messaging/hooks/use-offer';
import { useOfferActions } from '@/features/messaging/hooks/use-offer-actions';
import PageHeader from '@/components/layout/page-header';
import ErrorState from '@/components/indicators/error-state';
import InlineBanner from '@/components/indicators/inline-banner';
import ComposeBar from '@/features/messaging/components/compose-bar';
import MessageThread from '@/features/messaging/components/message-thread';
import CollapsibleHeader from '@/features/messaging/components/collapsible-header';
import styles from './thread-detail-page.module.scss';

interface ThreadDetailPageProps {
  threadId: string;
}

const SKELETON_ROWS = [
  { side: 'left', size: 'medium' },
  { side: 'right', size: 'short' },
  { side: 'left', size: 'short' },
  { side: 'right', size: 'medium' },
  { side: 'left', size: 'medium' },
  { side: 'right', size: 'short' },
] as const;

export default function ThreadDetailPage({ threadId }: ThreadDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

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

  // Extract offer_id from the latest offer_node message for offer threads
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

  const offerActions = useOfferActions({
    offerId: latestOfferId ?? '',
    onSuccess: () => {},
  });
  const isOfferActionPending =
    offerActions.accept.isPending ||
    offerActions.decline.isPending ||
    offerActions.counter.isPending;

  const messageAreaRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef(0);
  const hasScrolledToBottomRef = useRef(false);

  // Initial scroll to bottom on first load
  useEffect(() => {
    if (messageAreaRef.current && data && !hasScrolledToBottomRef.current) {
      messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
      previousScrollHeightRef.current = messageAreaRef.current.scrollHeight;
      hasScrolledToBottomRef.current = true;
    }
  }, [data]);

  // Preserve scroll position when older messages load at the top
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

  // Infinite scroll sentinel — fires fetchNextPage when top sentinel enters viewport
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
    if (threadId) {
      markRead.mutate(threadId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const isLoading = isThreadLoading || isMessagesLoading;
  const isError = isThreadError || isMessagesError;

  const otherParticipant = thread?.participants.find((p) => p.member.id !== user?.id);
  const title = otherParticipant
    ? `${otherParticipant.member.first_name} ${otherParticipant.member.last_name}`
    : 'Messages';

  const handleRetry = () => {
    refetchThread();
    refetchMessages();
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <PageHeader title="" onBack={() => router.push('/messages')} />
        <div className={styles.messageArea}>
          <div className={styles.skeleton} role="status" aria-live="polite">
            <span className="sr-only">Loading conversation</span>
            <div className={styles.skeletonHeader} />
            {SKELETON_ROWS.map((row, i) => (
              <div
                key={i}
                className={`${styles.skeletonBubbleRow} ${row.side === 'right' ? styles.skeletonBubbleRowRight : ''}`}
              >
                <div className={styles.skeletonAvatar} />
                <div
                  className={`${styles.skeletonBubble} ${row.size === 'short' ? styles.skeletonBubbleShort : styles.skeletonBubbleMedium}`}
                />
              </div>
            ))}
          </div>
        </div>
        <ComposeBar threadId={threadId} disabled />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.page}>
        <PageHeader title="Messages" onBack={() => router.push('/messages')} />
        <div className={styles.messageArea}>
          <ErrorState
            variant="banner"
            message="Something went wrong loading this conversation"
            action={{ label: 'Retry', onClick: handleRetry }}
          />
        </div>
        <ComposeBar threadId={threadId} disabled />
      </div>
    );
  }

  const messages = data
    ? data.pages
        .slice()
        .reverse()
        .flatMap((page) => [...page.messages].reverse())
    : [];

  const isEmpty = messages.length === 0;
  const isThreadInactive = thread?.status === 'archived' || thread?.status === 'closed';
  const inactiveLabel =
    thread?.status === 'archived' ? 'This conversation is archived' : 'This conversation is closed';

  return (
    <div className={styles.page}>
      <PageHeader title={title} onBack={() => router.push('/messages')} />
      {thread && (
        <CollapsibleHeader
          thread={thread}
          currentUserId={user?.id ?? ''}
          offer={isOfferThread ? offer : undefined}
          onAcceptOffer={() => offerActions.accept.mutate()}
          // Counter-offer requires a modal/input flow (separate ticket — out of scope)
          onCounterOffer={undefined}
          onDeclineOffer={() => offerActions.decline.mutate()}
          isOfferPending={isOfferActionPending}
          isCollapsed={isHeaderCollapsed}
          onToggle={() => setIsHeaderCollapsed((prev) => !prev)}
        />
      )}
      <div className={styles.messageArea} ref={messageAreaRef}>
        <div ref={sentinelRef} />
        {isFetchingNextPage && (
          <div className={styles.loadingMore} role="status">
            <span className="sr-only">Loading older messages</span>
            <div className={styles.spinner} aria-hidden="true" />
          </div>
        )}
        {isEmpty ? (
          <div className={styles.emptyThread}>
            <p className={styles.emptyThreadText}>Send a message to get started</p>
          </div>
        ) : (
          <MessageThread messages={messages} currentUserId={user?.id ?? ''} />
        )}
      </div>
      {isThreadInactive && (
        <div className={styles.inactiveBanner}>
          <InlineBanner variant="info" title={inactiveLabel} />
        </div>
      )}
      <ComposeBar threadId={threadId} disabled={isThreadInactive} />
    </div>
  );
}
