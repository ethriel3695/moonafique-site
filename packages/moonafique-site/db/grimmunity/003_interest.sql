CREATE TABLE grim.interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('sandbox', 'live')),
  email text NOT NULL CHECK (length(email) <= 254),
  consent_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mode, email)
);

CREATE TABLE grim.interest_rate_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX ON grim.interest_rate_limits(expires_at);
