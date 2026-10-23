-- Add participant context to support member vs shop identities in messaging
CREATE TYPE participant_context_type AS ENUM ('member', 'shop');

ALTER TABLE public.message_thread_participants
  ADD COLUMN context_type participant_context_type NOT NULL DEFAULT 'member',
  ADD COLUMN context_id UUID;

-- Backfill: all existing participants are member context
UPDATE public.message_thread_participants
SET context_id = member_id
WHERE context_id IS NULL;

-- Now make context_id NOT NULL
ALTER TABLE public.message_thread_participants
  ALTER COLUMN context_id SET NOT NULL;

-- Replace unique constraint: a context identity can only appear once per thread
ALTER TABLE public.message_thread_participants
  DROP CONSTRAINT IF EXISTS message_thread_participants_thread_member_unique;

ALTER TABLE public.message_thread_participants
  ADD CONSTRAINT message_thread_participants_thread_context_unique
  UNIQUE (thread_id, context_type, context_id);

-- Index for fast inbox queries
CREATE INDEX idx_participants_context
  ON public.message_thread_participants (context_type, context_id);
