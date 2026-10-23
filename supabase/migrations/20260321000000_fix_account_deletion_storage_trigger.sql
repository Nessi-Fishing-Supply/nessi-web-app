-- ============================================================
-- Migration: fix_account_deletion_storage_trigger
-- Created: 2026-03-21
-- Fixes:
--   handle_profile_deletion() trigger tried to DELETE directly
--   from storage.objects, which Supabase blocks with:
--   "Direct deletion from storage tables is not allowed."
--   This caused the entire auth.users DELETE cascade to roll back,
--   making account deletion impossible.
--
-- Solution: Drop the trigger. Storage cleanup is now handled
--   in the API route via the Supabase Storage API before
--   calling deleteUser().
-- ============================================================

-- Drop the trigger that blocks account deletion
DROP TRIGGER IF EXISTS on_profile_deleted ON public.members;

-- Drop the function (no longer needed)
DROP FUNCTION IF EXISTS public.handle_profile_deletion();
