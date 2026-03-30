import { createClient } from '@/libs/supabase/server';
import type { Json } from '@/types/database';
import type {
  CreateThreadResult,
  MessageThread,
  ThreadType,
  ThreadWithParticipants,
  ParticipantRole,
} from '@/features/messaging/types/thread';
import type { MessageType, MessageWithSender } from '@/features/messaging/types/message';

async function buildThreadsWithParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  threads: MessageThread[],
  userId: string,
): Promise<ThreadWithParticipants[]> {
  if (threads.length === 0) return [];

  const threadIds = threads.map((t) => t.id);

  const { data: participants, error: participantsError } = await supabase
    .from('message_thread_participants')
    .select('*, members(id, first_name, last_name, avatar_url, slug)')
    .in('thread_id', threadIds);

  if (participantsError) {
    throw new Error(`Failed to get thread participants: ${participantsError.message}`);
  }

  const participantsByThread = new Map<string, typeof participants>();
  for (const p of participants ?? []) {
    const existing = participantsByThread.get(p.thread_id) ?? [];
    existing.push(p);
    participantsByThread.set(p.thread_id, existing);
  }

  return threads.map((thread) => {
    const threadParticipants = participantsByThread.get(thread.id) ?? [];
    const myParticipant = threadParticipants.find((p) => p.member_id === userId);

    return {
      ...thread,
      participants: threadParticipants.map((p) => {
        const memberData = p.members as {
          id: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          slug: string | null;
        } | null;

        return {
          id: p.id,
          thread_id: p.thread_id,
          member_id: p.member_id,
          role: p.role,
          joined_at: p.joined_at,
          last_read_at: p.last_read_at,
          unread_count: p.unread_count,
          is_blocked: p.is_blocked,
          member: {
            id: memberData?.id ?? p.member_id,
            first_name: memberData?.first_name ?? '',
            last_name: memberData?.last_name ?? '',
            avatar_url: memberData?.avatar_url ?? null,
            slug: memberData?.slug ?? null,
          },
        };
      }),
      my_unread_count: myParticipant?.unread_count ?? 0,
    };
  });
}

export async function getThreadsServer(
  userId: string,
  type?: ThreadType,
): Promise<ThreadWithParticipants[]> {
  const supabase = await createClient();

  const { data: myParticipantRows, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('thread_id')
    .eq('member_id', userId);

  if (participantError) {
    throw new Error(`Failed to get threads: ${participantError.message}`);
  }

  if (!myParticipantRows || myParticipantRows.length === 0) return [];

  const threadIds = myParticipantRows.map((p) => p.thread_id);

  const { data: blockerIds, error: blockError } = await supabase
    .from('member_blocks')
    .select('blocker_id')
    .eq('blocked_id', userId);

  if (blockError) {
    throw new Error(`Failed to check blocks: ${blockError.message}`);
  }

  const blockerSet = new Set((blockerIds ?? []).map((b) => b.blocker_id));

  let query = supabase
    .from('message_threads')
    .select('*')
    .in('id', threadIds)
    .eq('status', 'active')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data: threads, error: threadsError } = await query;

  if (threadsError) {
    throw new Error(`Failed to get threads: ${threadsError.message}`);
  }

  if (!threads || threads.length === 0) return [];

  const allThreads = await buildThreadsWithParticipants(
    supabase,
    threads as MessageThread[],
    userId,
  );

  return allThreads.filter((thread) => {
    const otherParticipants = thread.participants.filter((p) => p.member_id !== userId);
    return !otherParticipants.some((p) => blockerSet.has(p.member_id));
  });
}

export async function getThreadByIdServer(
  userId: string,
  threadId: string,
): Promise<ThreadWithParticipants | null> {
  const supabase = await createClient();

  const { data: myParticipant, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('member_id', userId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to verify thread participant: ${participantError.message}`);
  }

  if (!myParticipant) return null;

  const { data: thread, error: threadError } = await supabase
    .from('message_threads')
    .select('*')
    .eq('id', threadId)
    .single();

  if (threadError) {
    throw new Error(`Failed to get thread: ${threadError.message}`);
  }

  const results = await buildThreadsWithParticipants(supabase, [thread as MessageThread], userId);
  return results[0] ?? null;
}

export async function createThreadServer(params: {
  type: ThreadType;
  createdBy: string;
  participantIds: string[];
  roles: ParticipantRole[];
  listingId?: string;
  shopId?: string;
}): Promise<CreateThreadResult> {
  const supabase = await createClient();

  // [B2] Inquiry duplicate check — find existing inquiry threads for the listing,
  // then verify whether the buyer is already a participant in any of them
  if (params.type === 'inquiry' && params.listingId) {
    const buyerIndex = params.roles.indexOf('buyer');
    const buyerId = buyerIndex >= 0 ? params.participantIds[buyerIndex] : params.createdBy;

    const { data: existingThreads, error: lookupError } = await supabase
      .from('message_threads')
      .select('id')
      .eq('listing_id', params.listingId)
      .eq('type', 'inquiry');

    if (lookupError) {
      throw new Error(`Failed to check existing inquiry thread: ${lookupError.message}`);
    }

    if (existingThreads && existingThreads.length > 0) {
      const threadIds = existingThreads.map((t) => t.id);

      const { data: buyerParticipation, error: partError } = await supabase
        .from('message_thread_participants')
        .select('thread_id')
        .eq('member_id', buyerId)
        .in('thread_id', threadIds)
        .maybeSingle();

      if (partError) {
        throw new Error(`Failed to check buyer participation: ${partError.message}`);
      }

      if (buyerParticipation) {
        const { data: existingThread, error: threadError } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', buyerParticipation.thread_id)
          .single();

        if (threadError) {
          throw new Error(`Failed to get existing inquiry thread: ${threadError.message}`);
        }

        const results = await buildThreadsWithParticipants(
          supabase,
          [existingThread as MessageThread],
          params.createdBy,
        );
        return { thread: results[0], existing: true };
      }
    }
  }

  // Direct thread duplicate check — find threads shared by both participants
  if (params.type === 'direct' && params.participantIds.length === 2) {
    const [memberA, memberB] = params.participantIds;

    const { data: memberAParticipations, error: lookupError } = await supabase
      .from('message_thread_participants')
      .select('thread_id')
      .eq('member_id', memberA);

    if (lookupError) {
      throw new Error(`Failed to check existing direct thread: ${lookupError.message}`);
    }

    if (memberAParticipations && memberAParticipations.length > 0) {
      const threadIds = memberAParticipations.map((p) => p.thread_id);

      const { data: sharedThread, error: sharedError } = await supabase
        .from('message_thread_participants')
        .select('thread_id')
        .eq('member_id', memberB)
        .in('thread_id', threadIds)
        .maybeSingle();

      if (sharedError) {
        throw new Error(`Failed to check existing direct thread: ${sharedError.message}`);
      }

      if (sharedThread) {
        const { data: existingThread, error: threadError } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', sharedThread.thread_id)
          .eq('type', 'direct')
          .maybeSingle();

        if (threadError) {
          throw new Error(`Failed to get existing direct thread: ${threadError.message}`);
        }

        if (existingThread) {
          const results = await buildThreadsWithParticipants(
            supabase,
            [existingThread as MessageThread],
            params.createdBy,
          );
          return { thread: results[0], existing: true };
        }
      }
    }
  }

  const { data: thread, error: threadError } = await supabase
    .from('message_threads')
    .insert({
      type: params.type,
      created_by: params.createdBy,
      listing_id: params.listingId ?? null,
      shop_id: params.shopId ?? null,
    })
    .select()
    .single();

  if (threadError) {
    throw new Error(`Failed to create thread: ${threadError.message}`);
  }

  const participantRows = params.participantIds.map((memberId, index) => ({
    thread_id: thread.id,
    member_id: memberId,
    role: params.roles[index],
  }));

  const { error: participantsError } = await supabase
    .from('message_thread_participants')
    .insert(participantRows);

  if (participantsError) {
    throw new Error(`Failed to create thread participants: ${participantsError.message}`);
  }

  // [B1] Return ThreadWithParticipants instead of raw MessageThread
  const results = await buildThreadsWithParticipants(
    supabase,
    [thread as MessageThread],
    params.createdBy,
  );
  return { thread: results[0], existing: false };
}

export async function getMessagesServer(
  userId: string,
  threadId: string,
  cursor?: string,
  limit = 50,
): Promise<{ messages: MessageWithSender[]; nextCursor: string | null }> {
  const supabase = await createClient();

  const { data: myParticipant, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('member_id', userId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to verify thread participant: ${participantError.message}`);
  }

  if (!myParticipant) {
    throw new Error('Not a participant in this thread');
  }

  let query = supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    const { data: cursorMessage, error: cursorError } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', cursor)
      .single();

    if (cursorError) {
      throw new Error(`Failed to resolve cursor: ${cursorError.message}`);
    }

    query = query.lt('created_at', cursorMessage.created_at);
  }

  const { data: rawMessages, error: messagesError } = await query;

  if (messagesError) {
    throw new Error(`Failed to get messages: ${messagesError.message}`);
  }

  const messages = rawMessages ?? [];
  const hasMore = messages.length > limit;
  const pageMessages = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? (pageMessages[pageMessages.length - 1]?.id ?? null) : null;

  if (pageMessages.length === 0) {
    return { messages: [], nextCursor: null };
  }

  const senderIds = [...new Set(pageMessages.map((m) => m.sender_id))];

  const { data: senders, error: sendersError } = await supabase
    .from('members')
    .select('id, first_name, last_name, avatar_url')
    .in('id', senderIds);

  if (sendersError) {
    throw new Error(`Failed to get message senders: ${sendersError.message}`);
  }

  const senderMap = new Map((senders ?? []).map((s) => [s.id, s]));

  const messagesWithSender: MessageWithSender[] = pageMessages.map((message) => {
    const sender = senderMap.get(message.sender_id);
    return {
      ...message,
      sender: {
        id: sender?.id ?? message.sender_id,
        first_name: sender?.first_name ?? '',
        last_name: sender?.last_name ?? '',
        avatar_url: sender?.avatar_url ?? null,
      },
    } as MessageWithSender;
  });

  return { messages: messagesWithSender, nextCursor };
}

export async function createMessageServer(params: {
  threadId: string;
  senderId: string;
  content: string;
  type?: MessageType;
  metadata?: Record<string, unknown>;
  isFiltered?: boolean;
  originalContent?: string;
}): Promise<MessageWithSender> {
  const supabase = await createClient();

  // [B3] Verify sender is a participant before inserting
  const { data: participant, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', params.threadId)
    .eq('member_id', params.senderId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to verify thread participant: ${participantError.message}`);
  }

  if (!participant) {
    throw new Error('Not a participant in this thread');
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: params.threadId,
      sender_id: params.senderId,
      content: params.content,
      type: params.type ?? 'text',
      metadata: (params.metadata ?? null) as Json | null,
      is_filtered: params.isFiltered ?? false,
      original_content: params.originalContent ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  // [B4] Update thread metadata after inserting message
  const preview =
    params.content.length > 100 ? params.content.slice(0, 100) + '...' : params.content;

  const { error: threadUpdateError } = await supabase
    .from('message_threads')
    .update({ last_message_at: message.created_at, last_message_preview: preview })
    .eq('id', params.threadId);

  if (threadUpdateError) {
    throw new Error(`Failed to update thread metadata: ${threadUpdateError.message}`);
  }

  // Increment unread count for all other participants
  const { data: otherParticipants, error: fetchParticipantsError } = await supabase
    .from('message_thread_participants')
    .select('id, unread_count')
    .eq('thread_id', params.threadId)
    .neq('member_id', params.senderId);

  if (!fetchParticipantsError && otherParticipants) {
    for (const p of otherParticipants) {
      await supabase
        .from('message_thread_participants')
        .update({ unread_count: p.unread_count + 1 })
        .eq('id', p.id);
    }
  }

  // [B5] Fetch sender and return MessageWithSender
  const { data: sender, error: senderError } = await supabase
    .from('members')
    .select('id, first_name, last_name, avatar_url')
    .eq('id', params.senderId)
    .single();

  if (senderError) {
    throw new Error(`Failed to get message sender: ${senderError.message}`);
  }

  return {
    ...message,
    sender: {
      id: sender.id,
      first_name: sender.first_name,
      last_name: sender.last_name,
      avatar_url: sender.avatar_url,
    },
  } as MessageWithSender;
}

export async function markThreadReadServer(userId: string, threadId: string): Promise<void> {
  const supabase = await createClient();

  // [W1] Verify the user is a participant before marking read
  const { data: myParticipant, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('member_id', userId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to verify thread participant: ${participantError.message}`);
  }

  if (!myParticipant) {
    throw new Error('Not a participant in this thread');
  }

  const { error } = await supabase
    .from('message_thread_participants')
    .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
    .eq('thread_id', threadId)
    .eq('member_id', userId);

  if (error) {
    throw new Error(`Failed to mark thread as read: ${error.message}`);
  }
}

export async function archiveThreadServer(userId: string, threadId: string): Promise<void> {
  const supabase = await createClient();

  const { data: myParticipant, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('id')
    .eq('thread_id', threadId)
    .eq('member_id', userId)
    .maybeSingle();

  if (participantError) {
    throw new Error(`Failed to verify thread participant: ${participantError.message}`);
  }

  if (!myParticipant) {
    throw new Error('Not a participant in this thread');
  }

  const { error } = await supabase
    .from('message_threads')
    .update({ status: 'archived' })
    .eq('id', threadId);

  if (error) {
    throw new Error(`Failed to archive thread: ${error.message}`);
  }
}

export async function getUnreadCountServer(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: myParticipantRows, error: participantError } = await supabase
    .from('message_thread_participants')
    .select('thread_id, unread_count')
    .eq('member_id', userId);

  if (participantError) {
    throw new Error(`Failed to get unread count: ${participantError.message}`);
  }

  if (!myParticipantRows || myParticipantRows.length === 0) return 0;

  const threadIds = myParticipantRows.map((p) => p.thread_id);

  const { data: activeThreads, error: threadsError } = await supabase
    .from('message_threads')
    .select('id')
    .in('id', threadIds)
    .eq('status', 'active');

  if (threadsError) {
    throw new Error(`Failed to get active threads for unread count: ${threadsError.message}`);
  }

  const activeThreadIds = new Set((activeThreads ?? []).map((t) => t.id));

  return myParticipantRows
    .filter((p) => activeThreadIds.has(p.thread_id))
    .reduce((sum, p) => sum + p.unread_count, 0);
}
