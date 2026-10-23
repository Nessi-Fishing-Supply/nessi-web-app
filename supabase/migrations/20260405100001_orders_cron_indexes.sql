-- ============================================================
-- Migration: orders_cron_indexes
-- Issue: #30
-- Created: 2026-04-05
--
-- Adds composite partial indexes for cron job queries on orders.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_verification_deadline
  ON public.orders (status, verification_deadline)
  WHERE status = 'verification';

CREATE INDEX IF NOT EXISTS idx_orders_shipped_at
  ON public.orders (status, shipped_at)
  WHERE status = 'shipped';
