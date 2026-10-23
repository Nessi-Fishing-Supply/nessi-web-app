-- ============================================================
-- Migration: orders_fk_delete_behavior
-- Issue: #30
-- Created: 2026-04-05
--
-- Adds ON DELETE behavior to orders foreign keys:
-- buyer_id: SET NULL (preserve order history when buyer deletes account)
-- seller_id: RESTRICT (seller cannot delete account with orders)
-- ============================================================

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.members(id) ON DELETE SET NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_seller_id_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES public.members(id) ON DELETE RESTRICT;
