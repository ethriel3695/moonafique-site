CREATE TABLE grim.shipping_quotes (
  id uuid PRIMARY KEY,
  program_id text NOT NULL REFERENCES grim.program(id),
  owner_id text NOT NULL,
  tier_id text NOT NULL,
  address jsonb NOT NULL,
  parcel jsonb NOT NULL,
  shipment_id text NOT NULL,
  rate jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX shipping_quote_owner ON grim.shipping_quotes(program_id,owner_id,created_at);
ALTER TABLE grim.reservations ADD COLUMN shipping_quote_id uuid UNIQUE REFERENCES grim.shipping_quotes(id);
ALTER TABLE grim.reservations ADD COLUMN shipping_address jsonb;
CREATE TABLE grim.shipping_labels (
  fulfillment_id uuid PRIMARY KEY REFERENCES grim.fulfillments(id),
  quote_id uuid NOT NULL,
  shipment_id text NOT NULL,
  address_snapshot jsonb NOT NULL,
  parcel jsonb NOT NULL,
  rates jsonb NOT NULL,
  quoted_at timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('quoted','purchasing','purchased','review')),
  rate_id text,
  amount integer,
  transaction_id text UNIQUE,
  label_url text,
  tracking_number text,
  tracking_url text,
  test boolean NOT NULL,
  CHECK (state <> 'purchased' OR (transaction_id IS NOT NULL AND label_url IS NOT NULL AND tracking_number IS NOT NULL))
);
