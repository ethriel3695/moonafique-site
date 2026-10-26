-- Preserve the former offer and all paid records. Enrollment requires a new tier configuration.
ALTER TABLE grim.program ADD COLUMN tiers jsonb;
UPDATE grim.program SET tiers = jsonb_build_array(jsonb_build_object(
  'id','entry','name','Grim Starter','description','One monthly subscriber Grim.',
  'price_id',price_id,'product_id',product_id,'amount',amount,
  'perks','[]'::jsonb,'benefits_confirmed',false
)), enabled=false, approved_at=NULL;
ALTER TABLE grim.program ALTER COLUMN tiers SET NOT NULL;
ALTER TABLE grim.program ADD CHECK (jsonb_typeof(tiers) = 'array');
-- Legacy columns are retained for recovery only. New code reads tiers.
ALTER TABLE grim.program ALTER COLUMN price_id DROP NOT NULL;
ALTER TABLE grim.program ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE grim.program ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE grim.memberships ADD COLUMN tier_snapshot jsonb;
UPDATE grim.memberships m SET tier_snapshot=p.tiers->0 FROM grim.program p WHERE p.id=m.program_id;
ALTER TABLE grim.memberships ALTER COLUMN tier_snapshot SET NOT NULL;
ALTER TABLE grim.reservations ADD COLUMN tier_snapshot jsonb;
UPDATE grim.reservations r SET tier_snapshot=m.tier_snapshot FROM grim.memberships m WHERE m.id=r.membership_id;
ALTER TABLE grim.reservations ALTER COLUMN tier_snapshot SET NOT NULL;
ALTER TABLE grim.entitlements ADD COLUMN tier_snapshot jsonb;
UPDATE grim.entitlements e SET tier_snapshot=m.tier_snapshot FROM grim.memberships m WHERE m.id=e.membership_id;
ALTER TABLE grim.entitlements ALTER COLUMN tier_snapshot SET NOT NULL;
ALTER TABLE grim.memberships ADD CHECK (tier_snapshot->>'id' IN ('entry','mid','high'));
ALTER TABLE grim.reservations ADD CHECK (tier_snapshot->>'id' IN ('entry','mid','high'));
ALTER TABLE grim.entitlements ADD CHECK (tier_snapshot->>'id' IN ('entry','mid','high'));
