-- Applied by scripts/grim-club/cli.ts migrate in a single transaction.
CREATE SCHEMA IF NOT EXISTS grim;
CREATE TABLE grim.program (
  id text PRIMARY KEY CHECK (id IN ('sandbox','live')),
  enabled boolean NOT NULL DEFAULT false,
  approved_at timestamptz,
  price_id text NOT NULL,
  product_id text NOT NULL,
  currency text NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  amount integer NOT NULL CHECK (amount > 0),
  member_cap integer NOT NULL CHECK (member_cap > 0),
  retained_copies integer NOT NULL CHECK (retained_copies >= 0),
  countries text[] NOT NULL CHECK (cardinality(countries) > 0),
  shipping_text text NOT NULL,
  tax_mode text NOT NULL CHECK (tax_mode IN ('inclusive','not_collecting')),
  terms_version text NOT NULL,
  cancellation_text text NOT NULL,
  recovery_text text NOT NULL,
  support_email text NOT NULL,
  portal_configuration_id text NOT NULL,
  timezone text NOT NULL DEFAULT 'America/Boise' CHECK (timezone = 'America/Boise'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE grim.editions (
  id uuid PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  month text NOT NULL CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  title text NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  retained_copies integer NOT NULL CHECK (retained_copies >= 0),
  enrollment_open timestamptz NOT NULL,
  enrollment_close timestamptz NOT NULL,
  period_open timestamptz NOT NULL,
  period_close timestamptz NOT NULL,
  payment_cutoff timestamptz NOT NULL,
  address_cutoff timestamptz NOT NULL,
  dispatch_start timestamptz NOT NULL,
  dispatch_end timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('draft','open','closed','vaulted')),
  UNIQUE(program_id,month),
  CHECK (period_open <= enrollment_open AND enrollment_open < enrollment_close AND enrollment_close <= period_close),
  CHECK (payment_cutoff >= enrollment_close AND address_cutoff >= payment_cutoff AND dispatch_start >= address_cutoff AND dispatch_end > dispatch_start),
  CHECK (period_open < period_close)
);
CREATE TABLE grim.memberships (
  id uuid PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  owner_id text NOT NULL,
  email text NOT NULL,
  customer_id text UNIQUE,
  subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  seat_held boolean NOT NULL DEFAULT false,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  period_start timestamptz,
  period_end timestamptz,
  address jsonb,
  address_valid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(program_id,owner_id)
);
CREATE TABLE grim.reservations (
  id uuid PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  edition_id uuid NOT NULL REFERENCES grim.editions(id),
  request_key uuid NOT NULL,
  session_id text UNIQUE,
  session_url text,
  state text NOT NULL CHECK (state IN ('creating','open','converted','released','review')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(membership_id,request_key)
);
CREATE UNIQUE INDEX one_pending_reservation ON grim.reservations(membership_id) WHERE state IN ('creating','open','review');
CREATE TABLE grim.events (
  id text PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  type text NOT NULL,
  object_id text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','done')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE TABLE grim.entitlements (
  invoice_id text PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  edition_id uuid REFERENCES grim.editions(id),
  amount_paid integer NOT NULL,
  currency text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  allocated boolean NOT NULL DEFAULT false,
  review_reason text,
  financial_state text NOT NULL DEFAULT 'paid' CHECK (financial_state IN ('paid','review','refunded','disputed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_paid_copy_per_edition ON grim.entitlements(membership_id,edition_id) WHERE allocated;
CREATE TABLE grim.fulfillments (
  id uuid PRIMARY KEY,
  invoice_id text NOT NULL UNIQUE REFERENCES grim.entitlements(invoice_id),
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  edition_id uuid NOT NULL REFERENCES grim.editions(id),
  state text NOT NULL CHECK (state IN ('paid','needs_address','ready','shipped','hold')),
  address_snapshot jsonb,
  locked_at timestamptz,
  shipped_at timestamptz,
  tracking_number text,
  tracking_url text,
  UNIQUE(membership_id,edition_id),
  CHECK (state NOT IN ('ready','shipped') OR (address_snapshot IS NOT NULL AND locked_at IS NOT NULL)),
  CHECK (state <> 'shipped' OR (shipped_at IS NOT NULL AND tracking_number IS NOT NULL))
);
CREATE TABLE grim.exceptions (
  id uuid PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  dedupe_key text NOT NULL UNIQUE,
  membership_id uuid REFERENCES grim.memberships(id),
  invoice_id text,
  reason text NOT NULL,
  resolved_at timestamptz,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE grim.audit (
  id bigserial PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  actor text NOT NULL,
  action text NOT NULL,
  entity_id text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE grim.outbox (
  id uuid PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  dedupe_key text NOT NULL UNIQUE,
  subject text NOT NULL,
  body text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sent','review')),
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  sent_at timestamptz,
  provider_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pending_events ON grim.events(program_id,state);
CREATE INDEX edition_fulfillments ON grim.fulfillments(edition_id,state);
