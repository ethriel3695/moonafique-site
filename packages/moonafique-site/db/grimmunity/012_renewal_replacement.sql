CREATE UNIQUE INDEX one_current_billing_cycle ON grim.billing_cycles(membership_id,period_start) WHERE state<>'canceled';
CREATE TABLE grim.billing_replacements (
  request_key uuid PRIMARY KEY,
  original_invoice_id text NOT NULL UNIQUE REFERENCES grim.billing_cycles(invoice_id),
  replacement_invoice_id text UNIQUE,
  membership_id uuid NOT NULL REFERENCES grim.memberships(id),
  state text NOT NULL CHECK (state IN ('preparing','prepared','review')),
  address jsonb NOT NULL,
  parcel jsonb NOT NULL,
  rate jsonb NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  base_start timestamptz,
  base_end timestamptz,
  base_amount integer NOT NULL CHECK (base_amount>=0),
  actor text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
