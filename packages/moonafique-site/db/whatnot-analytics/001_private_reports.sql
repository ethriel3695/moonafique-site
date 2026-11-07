CREATE SCHEMA IF NOT EXISTS whatnot_private;
CREATE TABLE IF NOT EXISTS whatnot_private.refreshes (
  id uuid PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('requesting','pending','ready','failed')),
  seller_id text NOT NULL,
  currency text NOT NULL,
  coverage_start timestamptz NOT NULL,
  coverage_end timestamptz NOT NULL,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  report_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  lease_id uuid,
  lease_until timestamptz,
  error_code text,
  CHECK (coverage_end > coverage_start)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_whatnot_refresh ON whatnot_private.refreshes ((true)) WHERE status IN ('requesting','pending');
CREATE TABLE IF NOT EXISTS whatnot_private.snapshot (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  refresh_id uuid NOT NULL REFERENCES whatnot_private.refreshes(id),
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- This schema is used only by the server's existing database role. It is never
-- read by the public storefront and grants no anonymous/database-public access.
REVOKE ALL ON SCHEMA whatnot_private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA whatnot_private FROM PUBLIC;
