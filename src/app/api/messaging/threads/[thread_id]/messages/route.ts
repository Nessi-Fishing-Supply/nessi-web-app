import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getMessagesServer,
  createMessageServer,
} from '@/features/messaging/services/messaging-server';
import {
  scanText,
  logModerationFlag,
  NUDGE_OFF_PLATFORM,
  NUDGE_NEGOTIATION,
} from '@/libs/moderation';
import { requireShopPermission } from '@/libs/shop-permissions';
import { parseMessageContext } from '@/features/messaging/utils/parse-context';

// List messages in a thread with cursor-based pagination
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    const { thread_id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: AUTH_CACHE_HEADERS },
      );
    }

    const cursor = request.nextUrl.searchParams.get('cursor') ?? undefined;
    const limitParam = request.nextUrl.searchParams.get('limit');
    const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 100);

    const result = await getMessagesServer(user.id, thread_id, cursor, limit);

    return NextResponse.json(result, { headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get messages';

    if (message === 'Not a participant in this thread') {
      return NextResponse.json(
        { error: 'You are not a participant in this thread' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    console.error('Failed to get messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}

// Send a message in a thread (applies safety filter before storage)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  try {
    const { thread_id } = await params;

    const context = parseMessageContext(request);

    if (context.type === 'shop') {
      const result = await requireShopPermission(request, 'messaging', 'full');
      if (result instanceof NextResponse) return result;
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: AUTH_CACHE_HEADERS },
      );
    }

    const body = await request.json();
    const { content, type } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Verify sender is a participant and get other participant IDs
    const { data: participants, error: participantsError } = await supabase
      .from('message_thread_participants')
      .select('member_id, context_type, context_id')
      .eq('thread_id', thread_id);

    if (participantsError) {
      throw new Error(`Failed to get thread participants: ${participantsError.message}`);
    }

    const isParticipant =
      context.type === 'shop'
        ? participants?.some((p) => p.context_type === 'shop' && p.context_id === context.shopId)
        : participants?.some((p) => p.member_id === user.id);

    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You are not a participant in this thread' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Check if any other participant has blocked the sender
    const otherMemberIds = participants
      .filter((p) => p.member_id !== user.id)
      .map((p) => p.member_id);

    if (otherMemberIds.length > 0) {
      const { data: blocks, error: blockError } = await supabase
        .from('member_blocks')
        .select('id')
        .eq('blocked_id', user.id)
        .in('blocker_id', otherMemberIds)
        .limit(1);

      if (blockError) {
        throw new Error(`Failed to check blocks: ${blockError.message}`);
      }

      if (blocks && blocks.length > 0) {
        return NextResponse.json(
          { error: 'You cannot send messages to this user.' },
          { status: 403, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    // Run safety filter
    const filterResult = scanText(content.trim(), 'message');

    if (filterResult.action === 'block') {
      void logModerationFlag({
        memberId: user.id,
        context: 'message',
        action: 'block',
        originalContent: filterResult.originalContent,
        sourceId: thread_id,
      });
      return NextResponse.json(
        { error: 'This message contains content that violates our community guidelines.' },
        { status: 422, headers: AUTH_CACHE_HEADERS },
      );
    }

    let messageContent = content.trim();
    let isFiltered = false;
    let originalContent: string | undefined;

    if (filterResult.action === 'redact') {
      messageContent = filterResult.filteredContent ?? content.trim();
      isFiltered = true;
      originalContent = filterResult.originalContent;
      void logModerationFlag({
        memberId: user.id,
        context: 'message',
        action: 'redact',
        originalContent: filterResult.originalContent,
        filteredContent: filterResult.filteredContent,
        sourceId: thread_id,
      });
    }

    const message = await createMessageServer({
      threadId: thread_id,
      senderId: user.id,
      content: messageContent,
      type: type ?? 'text',
      isFiltered,
      originalContent,
    });

    // Insert nudge system message after the user's message
    if (
      filterResult.action === 'nudge_off_platform' ||
      filterResult.action === 'nudge_negotiation'
    ) {
      const nudgeText =
        filterResult.action === 'nudge_off_platform' ? NUDGE_OFF_PLATFORM : NUDGE_NEGOTIATION;

      await createMessageServer({
        threadId: thread_id,
        senderId: user.id,
        content: nudgeText,
        type: 'nudge',
        metadata: { system_generated: true },
      });
    }

    // Fire-and-forget email notification for first unread message
    void (async () => {
      try {
        const { data: updatedParticipants } = await supabase
          .from('message_thread_participants')
          .select('member_id, unread_count')
          .eq('thread_id', thread_id)
          .neq('member_id', user.id);

        if (!updatedParticipants) return;

        const recipientsToNotify = updatedParticipants.filter((p) => p.unread_count === 1);
        if (recipientsToNotify.length === 0) return;

        const { data: senderMember } = await supabase
          .from('members')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const senderName = senderMember
          ? `${senderMember.first_name} ${senderMember.last_name}`.trim()
          : 'Someone';

        const { newMessage } = await import('@/features/email/templates/new-message');
        const { sendNotificationEmail } =
          await import('@/features/messaging/utils/notification-email');

        const { subject, html } = newMessage({
          senderName,
          messagePreview: messageContent,
          threadId: thread_id,
        });

        for (const p of recipientsToNotify) {
          sendNotificationEmail({ recipientId: p.member_id, subject, html });
        }

        // Send email to shop members for shop participant threads
        const shopParticipants = participants.filter(
          (p) => p.context_type === 'shop' && p.context_id,
        );

        if (shopParticipants.length > 0) {
          const adminSupabase = (await import('@/libs/supabase/admin')).createAdminClient();
          const { getShopMembersWithPermission } =
            await import('@/features/messaging/utils/shop-notification');

          for (const sp of shopParticipants) {
            const { data: shopData } = await adminSupabase
              .from('shops')
              .select('shop_name')
              .eq('id', sp.context_id!)
              .single();

            const shopName = shopData?.shop_name ?? undefined;
            const { subject: shopSubject, html: shopHtml } = newMessage({
              senderName,
              messagePreview: messageContent,
              threadId: thread_id,
              shopName,
            });

            const shopMembers = await getShopMembersWithPermission(
              sp.context_id!,
              'messaging',
              'view',
            );

            for (const sm of shopMembers) {
              if (sm.member_id !== user.id) {
                sendNotificationEmail({
                  recipientId: sm.member_id,
                  subject: shopSubject,
                  html: shopHtml,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('[message-email-notification] failed:', err);
      }
    })();

    // Fire-and-forget in-app notification for text messages
    if ((type ?? 'text') === 'text') {
      void (async () => {
        try {
          const { data: senderMember } = await supabase
            .from('members')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single();

          const senderName = senderMember
            ? `${senderMember.first_name} ${senderMember.last_name}`.trim()
            : 'Someone';

          const preview =
            messageContent.length > 100 ? messageContent.slice(0, 100) + '...' : messageContent;

          const { dispatchNotification } =
            await import('@/features/notifications/utils/dispatch-notification');

          for (const p of participants.filter((p) => p.member_id !== user.id)) {
            dispatchNotification({
              userId: p.member_id,
              type: 'new_message',
              title: senderName,
              body: preview,
              link: `/dashboard/messages/${thread_id}`,
            });
          }

          // Notify all shop members with messaging permission for shop participants
          const { getShopMembersWithPermission } =
            await import('@/features/messaging/utils/shop-notification');

          const shopParticipants = participants.filter(
            (p) => p.context_type === 'shop' && p.context_id,
          );

          for (const sp of shopParticipants) {
            const shopMembers = await getShopMembersWithPermission(
              sp.context_id!,
              'messaging',
              'view',
            );
            for (const sm of shopMembers) {
              if (sm.member_id !== user.id) {
                dispatchNotification({
                  userId: sm.member_id,
                  type: 'new_message',
                  title: senderName,
                  body: preview,
                  link: `/dashboard/messages/${thread_id}`,
                });
              }
            }
          }
        } catch (err) {
          console.error('[message-in-app-notification] failed:', err);
        }
      })();
    }

    return NextResponse.json(message, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';

    if (errorMessage === 'Not a participant in this thread') {
      return NextResponse.json(
        { error: 'You are not a participant in this thread' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    console.error('Failed to send message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
