-- ============================================================
-- Migration: member_blocks_blocked_select_policy
-- Issue: #324
-- Created: 2026-03-30
--
-- Adds a SELECT RLS policy on member_blocks allowing blocked
-- users to query rows where they are the blocked party. This
-- enables the server client (user JWT) to check block status
-- from the blocked user's perspective without the admin client.
-- ============================================================

CREATE POLICY "member_blocks_select_blocked"
  ON public.member_blocks FOR SELECT
  TO authenticated
  USING (blocked_id = (SELECT auth.uid()));
