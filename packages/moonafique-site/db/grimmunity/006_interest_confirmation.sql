-- Existing contacts are not backfilled or emailed by this migration.
CREATE TABLE grim.interest_notifications (
  interest_id uuid PRIMARY KEY REFERENCES grim.interest(id) ON DELETE CASCADE,
  message jsonb NOT NULL,
  payload jsonb,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'review')),
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON grim.interest_notifications(created_at) WHERE state='pending';
