-- Production configuration audit, executed with owner approval November 3, 2026.
-- Receipt: readiness-neon-audit-20261103.json; grimmunity-production/main/neondb.
-- Read only the live program, its membership prices, and edition schedules.
-- Do not select customer records, addresses, credentials, or staff identities.
BEGIN TRANSACTION READ ONLY;

SELECT
  id,
  enabled,
  approved_at,
  billing_policy,
  currency,
  countries,
  tax_mode,
  terms_version,
  fulfillment_lead_days,
  cancellation_text,
  recovery_text,
  managed_portal_configuration_id
FROM grim.program
WHERE id = 'live';

SELECT
  tier->>'id' AS tier_id,
  tier->>'name' AS membership,
  tier->>'amount' AS monthly_amount_cents,
  tier->>'member_cap' AS member_cap,
  tier->>'retained_copies' AS retained_copies,
  tier->>'benefits_confirmed' AS benefits_confirmed,
  tier->>'shipping_mode' AS shipping_mode,
  tier->>'product_id' AS product_id,
  option->>'months' AS billing_months,
  option->>'amount' AS prepaid_amount_cents,
  option->>'discount' AS membership_discount,
  option->>'price_id' AS price_id
FROM grim.program AS p
CROSS JOIN LATERAL jsonb_array_elements(p.tiers) AS tier
LEFT JOIN LATERAL jsonb_array_elements(
  COALESCE(tier->'billing_options', '[]'::jsonb)
) AS option ON true
WHERE p.id = 'live'
ORDER BY tier->>'id', (option->>'months')::integer;

SELECT
  month,
  title,
  state,
  enrollment_open AT TIME ZONE 'America/Boise' AS enrollment_open_boise,
  enrollment_close AT TIME ZONE 'America/Boise' AS enrollment_close_boise,
  period_open AT TIME ZONE 'America/Boise' AS period_open_boise,
  period_close AT TIME ZONE 'America/Boise' AS period_close_boise,
  payment_cutoff AT TIME ZONE 'America/Boise' AS payment_cutoff_boise,
  address_cutoff AT TIME ZONE 'America/Boise' AS address_cutoff_boise,
  dispatch_start AT TIME ZONE 'America/Boise' AS dispatch_start_boise,
  dispatch_end AT TIME ZONE 'America/Boise' AS dispatch_end_boise,
  tier_allocations
FROM grim.editions
WHERE program_id = 'live'
ORDER BY month
LIMIT 12;

ROLLBACK;
