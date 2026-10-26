CREATE SCHEMA IF NOT EXISTS customs;

CREATE TABLE customs.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL CHECK (mode IN ('sandbox', 'live')),
  submission_key uuid NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  email text CHECK (length(email) <= 254),
  whatnot_username text CHECK (length(whatnot_username) <= 80),
  request text NOT NULL CHECK (length(request) BETWEEN 10 AND 3000),
  details text NOT NULL DEFAULT '' CHECK (length(details) <= 4000),
  needed_by date,
  occasion text NOT NULL DEFAULT '' CHECK (length(occasion) <= 300),
  acknowledgement_version text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','in_progress','completed','declined')),
  staff_notes text NOT NULL DEFAULT '' CHECK (length(staff_notes) <= 4000),
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  CHECK (email IS NOT NULL OR whatnot_username IS NOT NULL),
  UNIQUE (mode, submission_key)
);
CREATE INDEX ON customs.requests(mode, status, needed_by, created_at, id);

CREATE TABLE customs.rate_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX ON customs.rate_limits(expires_at);
