import { createClient } from '@/libs/supabase/server';
import type { Json } from '@/types/database';
import type {
  MessageThread,
  ThreadType,
  ThreadWithParticipants,
  ParticipantRole,
} from '@/features/messaging/types/thread';
import type { Message, MessageType, MessageWithSender } from '@/features/messaging/types/message';

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
}): Promise<MessageThread> {
  const supabase = await createClient();

  if (params.type === 'inquiry' && params.listingId) {
    const buyerIndex = params.roles.indexOf('buyer');
    const buyerId = buyerIndex >= 0 ? params.participantIds[buyerIndex] : params.createdBy;

    const { data: existingParticipant, error: lookupError } = await supabase
      .from('message_thread_participants')
      .select('thread_id')
      .eq('member_id', buyerId)
      .single();

    if (!lookupError && existingParticipant) {
      const { data: existingThread, error: threadLookupError } = await supabase
        .from('message_threads')
        .select('*')
        .eq('id', existingParticipant.thread_id)
        .eq('listing_id', params.listingId)
        .eq('type', 'inquiry')
        .maybeSingle();

      if (threadLookupError) {
        throw new Error(`Failed to check existing inquiry thread: ${threadLookupError.message}`);
      }

      if (existingThread) return existingThread as MessageThread;
    }
  }

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

        if (existingThread) return existingThread as MessageThread;
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

  return thread as MessageThread;
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
}): Promise<Message> {
  const supabase = await createClient();

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: params.threadId,
      sender_id: params.senderId,
      content: params.content,
      type: params.type ?? 'text',
      metadata: (params.metadata ?? null) as Json | null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return message as Message;
}

export async function markThreadReadServer(userId: string, threadId: string): Promise<void> {
  const supabase = await createClient();

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
