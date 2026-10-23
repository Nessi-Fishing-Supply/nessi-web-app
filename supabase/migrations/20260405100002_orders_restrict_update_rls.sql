-- ============================================================
-- Migration: orders_restrict_update_rls
-- Issue: #30 (review fix)
-- Created: 2026-04-05
--
-- Removes user-level UPDATE policies on orders.
-- All order updates now go through admin/service_role client.
-- ============================================================

DROP POLICY IF EXISTS "orders_buyer_update" ON public.orders;
DROP POLICY IF EXISTS "orders_seller_update" ON public.orders;
