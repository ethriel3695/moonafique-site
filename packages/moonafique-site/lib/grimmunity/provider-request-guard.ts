import { database, transaction } from "./db";
import { ClubError } from "./model";
import { cleanRequestLimits, clientIp, limitRequest } from "./request-limits";

const limits = {
  storefront: { ip: 20, account: 0 },
  membership: { ip: 20, account: 8 },
  shipping: { ip: 60, account: 20 },
};

export async function guardProviderRequest(request: Request, operation: keyof typeof limits, ownerId?: string) {
  const secret = process.env.GRIM_INTEREST_SECRET ?? "";
  if (secret.length < 32) throw new ClubError("service_unavailable", 503);
  const now = new Date();
  const windowMs = 10 * 60 * 1000;
  const scope = `provider:${process.env.GRIM_MODE ?? "sandbox"}:${operation}`;
  const allowed = await transaction(database(), async (db) => {
    await cleanRequestLimits(db, now);
    if (!await limitRequest(db, secret, `${scope}:ip`, clientIp(request), limits[operation].ip, windowMs, now)) return false;
    return !ownerId || await limitRequest(db, secret, `${scope}:owner`, ownerId, limits[operation].account, windowMs, now);
  });
  if (!allowed) throw new ClubError("checkout_rate_limited", 429);
}
