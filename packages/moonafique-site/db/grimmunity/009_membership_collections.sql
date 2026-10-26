-- Keep historic prices, tier promises, and paid allocations intact.
-- Membership families allow the same owner to join both Grimm and ACEO clubs.
ALTER TABLE grim.memberships DROP CONSTRAINT memberships_tier_snapshot_check;
ALTER TABLE grim.reservations DROP CONSTRAINT reservations_tier_snapshot_check;
ALTER TABLE grim.entitlements DROP CONSTRAINT entitlements_tier_snapshot_check;
ALTER TABLE grim.memberships ADD CHECK (tier_snapshot->>'id' IN ('entry','mid','high','grimm_starter','grimm_keeper','aceo_prints','aceo_originals'));
ALTER TABLE grim.reservations ADD CHECK (tier_snapshot->>'id' IN ('entry','mid','high','grimm_starter','grimm_keeper','aceo_prints','aceo_originals'));
ALTER TABLE grim.entitlements ADD CHECK (tier_snapshot->>'id' IN ('entry','mid','high','grimm_starter','grimm_keeper','aceo_prints','aceo_originals'));
ALTER TABLE grim.memberships DROP CONSTRAINT memberships_program_id_owner_id_key;
ALTER TABLE grim.memberships ADD COLUMN club text GENERATED ALWAYS AS (
  CASE WHEN tier_snapshot->>'id' IN ('aceo_prints','aceo_originals') THEN 'aceo' ELSE 'grimm' END
) STORED;
ALTER TABLE grim.memberships ADD UNIQUE(program_id,owner_id,club);
ALTER TABLE grim.memberships ADD COLUMN preferences jsonb;
ALTER TABLE grim.reservations ADD COLUMN preferences jsonb;
ALTER TABLE grim.entitlements ADD COLUMN preferences jsonb;
-- A saved edition owns its allocation limits; null preserves the legacy shared cap.
ALTER TABLE grim.editions ADD COLUMN tier_allocations jsonb;
ALTER TABLE grim.editions ADD CHECK (tier_allocations IS NULL OR jsonb_typeof(tier_allocations)='object');
-- A reviewed configuration must be applied before new enrollments use the new offer.
UPDATE grim.program SET enabled=false,approved_at=NULL;
