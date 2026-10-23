-- ============================================================
-- Migration: create_messaging
-- Issue: #302
-- Created: 2026-03-30
--
-- Creates messaging tables: message_threads, message_thread_participants,
-- messages with enums, indexes, RLS policies, and triggers.
-- ============================================================

-- ============================================================
-- 1. Enums
-- ============================================================

CREATE TYPE thread_type AS ENUM ('inquiry', 'direct', 'offer', 'custom_request');
CREATE TYPE thread_status AS ENUM ('active', 'archived', 'closed');
CREATE TYPE participant_role AS ENUM ('buyer', 'seller', 'initiator', 'recipient');
CREATE TYPE message_type AS ENUM ('text', 'system', 'offer_node', 'custom_request_node', 'listing_node', 'nudge');

-- ============================================================
-- 2. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.message_threads (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  thread_type  NOT NULL,
  status                thread_status NOT NULL DEFAULT 'active',
  listing_id            UUID         REFERENCES public.listings(id) ON DELETE SET NULL,
  shop_id               UUID         REFERENCES public.shops(id) ON DELETE SET NULL,
  created_by            UUID         NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_message_at       TIMESTAMPTZ,
  last_message_preview  TEXT
);

CREATE TABLE IF NOT EXISTS public.message_thread_participants (
  id            UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id     UUID              NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  member_id     UUID              NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  role          participant_role  NOT NULL,
  unread_count  INTEGER          NOT NULL DEFAULT 0,
  is_blocked    BOOLEAN          NOT NULL DEFAULT false,
  joined_at     TIMESTAMPTZ      NOT NULL DEFAULT now(),
  last_read_at  TIMESTAMPTZ,
  CONSTRAINT message_thread_participants_thread_member_unique UNIQUE (thread_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id        UUID          NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id        UUID          NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  content          TEXT,
  type             message_type  NOT NULL DEFAULT 'text',
  metadata         JSONB,
  is_filtered      BOOLEAN       NOT NULL DEFAULT false,
  original_content TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  edited_at        TIMESTAMPTZ
);

-- ============================================================
-- 3. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_message_threads_type
  ON public.message_threads (type);

CREATE INDEX IF NOT EXISTS idx_message_threads_listing_id
  ON public.message_threads (listing_id);

CREATE INDEX IF NOT EXISTS idx_message_threads_shop_id
  ON public.message_threads (shop_id);

CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at
  ON public.message_threads (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_thread_participants_member_thread
  ON public.message_thread_participants (member_id, thread_id);

CREATE INDEX IF NOT EXISTS idx_message_thread_participants_member_id
  ON public.message_thread_participants (member_id);

CREATE INDEX IF NOT EXISTS idx_messages_thread_created_at
  ON public.messages (thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

-- ============================================================
-- 4. Enable RLS
-- ============================================================

ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

-- Note: No INSERT policies on message_threads or message_thread_participants.
-- Thread and participant creation is handled via server service (admin client)
-- in API routes, not directly through client-side Supabase calls.

DROP POLICY IF EXISTS "message_threads_select_participants" ON public.message_threads;
CREATE POLICY "message_threads_select_participants"
  ON public.message_threads FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.message_thread_participants
    WHERE thread_id = message_threads.id AND member_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "message_thread_participants_select_own" ON public.message_thread_participants;
CREATE POLICY "message_thread_participants_select_own"
  ON public.message_thread_participants FOR SELECT
  TO authenticated
  USING (member_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "message_thread_participants_update_own" ON public.message_thread_participants;
CREATE POLICY "message_thread_participants_update_own"
  ON public.message_thread_participants FOR UPDATE
  TO authenticated
  USING (member_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "messages_select_participants" ON public.messages;
CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.message_thread_participants
    WHERE thread_id = messages.thread_id AND member_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS "messages_insert_participants" ON public.messages;
CREATE POLICY "messages_insert_participants"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.message_thread_participants
      WHERE thread_id = messages.thread_id AND member_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 6. Trigger Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_thread_last_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.message_threads
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.content, 100)
    WHERE id = NEW.thread_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_unread_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.message_thread_participants
    SET unread_count = unread_count + 1
    WHERE thread_id = NEW.thread_id AND member_id != NEW.sender_id;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_thread_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Triggers
-- ============================================================

DROP TRIGGER IF EXISTS trg_update_thread_last_message ON public.messages;
CREATE TRIGGER trg_update_thread_last_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_last_message();

DROP TRIGGER IF EXISTS trg_increment_unread_count ON public.messages;
CREATE TRIGGER trg_increment_unread_count
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count();

DROP TRIGGER IF EXISTS trg_update_thread_timestamp ON public.message_threads;
CREATE TRIGGER trg_update_thread_timestamp
  BEFORE UPDATE ON public.message_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_thread_timestamp();
