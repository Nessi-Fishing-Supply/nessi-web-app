import { createClient } from '@/libs/supabase/server';
import { AUTH_CACHE_HEADERS } from '@/libs/api-headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMessageServer } from '@/features/messaging/services/messaging-server';
import { scanImage } from '@/features/messaging/utils/image-moderation';
import type { ImageAttachment } from '@/features/messaging/types/message';
import { IMAGE_MESSAGE_PREVIEW } from '@/features/messaging/utils/constants';

export const runtime = 'nodejs';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 4;
const MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;

// Upload images in a message thread
export async function POST(
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

    // Verify sender is a participant and get all participant IDs
    const { data: participants, error: participantsError } = await supabase
      .from('message_thread_participants')
      .select('member_id')
      .eq('thread_id', thread_id);

    if (participantsError) {
      throw new Error(`Failed to get thread participants: ${participantsError.message}`);
    }

    const isParticipant = participants?.some((p) => p.member_id === user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You are not a participant in this thread' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Check if any other participant has blocked the sender
    const otherMemberIds = (participants ?? [])
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

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum is ${MAX_FILES}.` },
        { status: 400, headers: AUTH_CACHE_HEADERS },
      );
    }

    // Validate all files before processing
    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Accepted: JPEG, PNG, WebP, GIF' },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'File exceeds 5MB limit' },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }
    }

    const sharp = (await import('sharp')).default;
    const messageId = crypto.randomUUID();
    const uploadedImages: ImageAttachment[] = [];
    const uploadedPaths: string[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());

      // Run moderation on original buffer
      const scanResult = await scanImage(buffer);
      if (!scanResult.passed) {
        // Cleanup any already-uploaded files
        if (uploadedPaths.length > 0) {
          await supabase.storage.from('message-images').remove(uploadedPaths);
        }
        return NextResponse.json(
          { error: 'Image failed moderation check.' },
          { status: 422, headers: AUTH_CACHE_HEADERS },
        );
      }

      const processed = sharp(buffer).resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      const webpBuffer = await processed.webp({ quality: WEBP_QUALITY }).toBuffer();
      const metadata = await sharp(webpBuffer).metadata();

      const fileUuid = crypto.randomUUID();
      const path = `threads/${thread_id}/${messageId}/${fileUuid}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('message-images')
        .upload(path, webpBuffer, { contentType: 'image/webp', upsert: false });

      if (uploadError) {
        // Cleanup already-uploaded files
        if (uploadedPaths.length > 0) {
          await supabase.storage.from('message-images').remove(uploadedPaths);
        }
        console.error('Storage upload error:', uploadError);
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 500, headers: AUTH_CACHE_HEADERS },
        );
      }

      uploadedPaths.push(path);

      const {
        data: { publicUrl },
      } = supabase.storage.from('message-images').getPublicUrl(path);

      uploadedImages.push({
        url: publicUrl,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      });
    }

    const message = await createMessageServer({
      threadId: thread_id,
      senderId: user.id,
      content: IMAGE_MESSAGE_PREVIEW,
      type: 'image',
      metadata: { images: uploadedImages },
    });

    // Fire-and-forget notifications (email + in-app)
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

        // Email notification for first unread message
        const { data: updatedParticipants } = await supabase
          .from('message_thread_participants')
          .select('member_id, unread_count')
          .eq('thread_id', thread_id)
          .neq('member_id', user.id);

        if (updatedParticipants) {
          const recipientsToNotify = updatedParticipants.filter((p) => p.unread_count === 1);
          if (recipientsToNotify.length > 0) {
            const { newMessage } = await import('@/features/email/templates/new-message');
            const { sendNotificationEmail } =
              await import('@/features/messaging/utils/notification-email');

            const { subject, html } = newMessage({
              senderName,
              messagePreview: IMAGE_MESSAGE_PREVIEW,
              threadId: thread_id,
            });

            for (const p of recipientsToNotify) {
              sendNotificationEmail({ recipientId: p.member_id, subject, html });
            }
          }
        }

        // In-app notification
        const { dispatchNotification } =
          await import('@/features/notifications/utils/dispatch-notification');

        for (const p of (participants ?? []).filter((p) => p.member_id !== user.id)) {
          dispatchNotification({
            userId: p.member_id,
            type: 'new_message',
            title: senderName,
            body: IMAGE_MESSAGE_PREVIEW,
            link: `/messages/${thread_id}`,
          });
        }
      } catch (err) {
        console.error('[image-upload-notification] failed:', err);
      }
    })();

    return NextResponse.json(message, { status: 201, headers: AUTH_CACHE_HEADERS });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';

    if (errorMessage === 'Not a participant in this thread') {
      return NextResponse.json(
        { error: 'You are not a participant in this thread' },
        { status: 403, headers: AUTH_CACHE_HEADERS },
      );
    }

    console.error('Failed to upload images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500, headers: AUTH_CACHE_HEADERS },
    );
  }
}
