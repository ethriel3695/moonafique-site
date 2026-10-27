ALTER TABLE grim.program ADD COLUMN billing_policy text CHECK (billing_policy IS NULL OR billing_policy='notice_shipping_v1');
ALTER TABLE grim.program ADD COLUMN managed_portal_configuration_id text;

CREATE TABLE grim.billing_cycles (
  invoice_id text PRIMARY KEY,
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  initial boolean NOT NULL DEFAULT false,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL CHECK (period_end>period_start),
  state text NOT NULL CHECK (state IN ('initial','preparing','noticed','paying','paid','hold','canceled')),
  address_snapshot jsonb NOT NULL,
  parcel jsonb NOT NULL,
  rate jsonb,
  membership_amount integer CHECK (membership_amount>=0),
  shipping_amount integer CHECK (shipping_amount>0),
  tax_amount integer CHECK (tax_amount>=0),
  total integer CHECK (total>0),
  fingerprint text,
  invoice_url text,
  notice_id uuid REFERENCES grim.outbox(id),
  notice_version integer NOT NULL DEFAULT 0,
  charge_at timestamptz,
  attempted_at timestamptz,
  coverage_invoice_id text,
  hold_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (state NOT IN ('noticed','paying','paid') OR (rate IS NOT NULL AND fingerprint IS NOT NULL AND total IS NOT NULL))
);
CREATE INDEX billing_cycles_member ON grim.billing_cycles(membership_id,period_start);

CREATE TABLE grim.prepaid_periods (
  invoice_id text PRIMARY KEY REFERENCES grim.billing_cycles(invoice_id),
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL CHECK (period_end>period_start),
  amount integer NOT NULL CHECK (amount>0),
  price_id text NOT NULL,
  financial_state text NOT NULL CHECK (financial_state IN ('paid','hold')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE grim.entitlements ADD COLUMN coverage_invoice_id text REFERENCES grim.prepaid_periods(invoice_id);
ALTER TABLE grim.outbox ADD COLUMN delivered_at timestamptz;
ALTER TABLE grim.outbox ADD COLUMN delivery_failed_at timestamptz;
ALTER TABLE grim.outbox ADD COLUMN delivery_event_at timestamptz;
CREATE UNIQUE INDEX outbox_provider_id ON grim.outbox(provider_id) WHERE provider_id IS NOT NULL;

-- Additive migration only. Existing members and immutable paid snapshots keep
-- their original billing flow. A separate operator decision opens enrollment.
