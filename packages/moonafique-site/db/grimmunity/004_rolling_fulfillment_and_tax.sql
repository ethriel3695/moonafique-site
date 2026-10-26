ALTER TABLE grim.program DROP CONSTRAINT program_tax_mode_check;
ALTER TABLE grim.program ADD CONSTRAINT program_tax_mode_check
  CHECK (tax_mode IN ('inclusive','exclusive','not_collecting'));
ALTER TABLE grim.program ADD COLUMN fulfillment_lead_days integer
  CHECK (fulfillment_lead_days BETWEEN 1 AND 30);
ALTER TABLE grim.fulfillments ADD COLUMN ship_by timestamptz;
