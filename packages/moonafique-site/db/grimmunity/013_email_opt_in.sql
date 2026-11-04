ALTER TABLE grim.interest
  ADD COLUMN purpose text NOT NULL DEFAULT 'launch' CHECK (purpose IN ('launch', 'newsletter')),
  ADD COLUMN confirmation_expires_at timestamptz,
  ADD COLUMN confirmed_at timestamptz,
  DROP CONSTRAINT interest_mode_email_key,
  ADD UNIQUE (mode, purpose, email);

-- Existing entries remain available for staff review. Do not mark them verified or email them.
CREATE INDEX ON grim.interest(mode, confirmed_at) WHERE purpose = 'launch';
