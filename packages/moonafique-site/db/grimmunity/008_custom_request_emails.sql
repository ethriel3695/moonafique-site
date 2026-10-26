-- Only new submissions schedule emails; historical requests are not backfilled.
CREATE TABLE customs.notifications (
  request_id uuid NOT NULL REFERENCES customs.requests(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('staff', 'customer')),
  message jsonb NOT NULL,
  payload jsonb,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sent','review')),
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, kind)
);
CREATE INDEX ON customs.notifications(created_at) WHERE state='pending';
CREATE INDEX ON customs.requests(mode,created_at,id);
