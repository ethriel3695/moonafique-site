ALTER TABLE grim.memberships ADD COLUMN last_reconciled_at timestamptz;
CREATE TABLE grim.worker_status (
  mode text PRIMARY KEY CHECK (mode IN ('live','sandbox')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  result jsonb
);
