import { database } from "./db";
import { ClubError, type Mode } from "./model";
import { Grimmunity } from "./service";
import { grimStripe, StripeGateway } from "./stripe-gateway";
export function grimMode(): Mode {
  const mode = process.env.GRIM_MODE ?? "sandbox";
  if (mode !== "sandbox" && mode !== "live")
    throw new ClubError("invalid_mode", 503);
  return mode;
}
export function club() {
  const mode = grimMode();
  return new Grimmunity(
    database(),
    new StripeGateway(grimStripe(mode)),
    mode,
    undefined,
    process.env.GRIM_LIVE_ENROLLMENT === "approved",
  );
}
