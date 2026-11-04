-- Leave the legacy interest tables available to the running and rollback deployments.
-- Their signups remain stored without being treated as confirmed opt-ins.
CREATE TABLE grim.email_opt_ins (LIKE grim.interest INCLUDING DEFAULTS INCLUDING CONSTRAINTS);
ALTER TABLE grim.email_opt_ins
  ADD PRIMARY KEY (id),
  ADD COLUMN purpose text NOT NULL CHECK (purpose IN ('launch', 'newsletter')),
  ADD COLUMN confirmation_expires_at timestamptz NOT NULL,
  ADD COLUMN confirmed_at timestamptz,
  ADD UNIQUE (mode, purpose, email);

CREATE INDEX ON grim.email_opt_ins(mode, confirmed_at) WHERE purpose = 'launch';

CREATE TABLE grim.email_opt_in_notifications (LIKE grim.interest_notifications INCLUDING ALL);
ALTER TABLE grim.email_opt_in_notifications
  ADD FOREIGN KEY (interest_id) REFERENCES grim.email_opt_ins(id) ON DELETE CASCADE;
