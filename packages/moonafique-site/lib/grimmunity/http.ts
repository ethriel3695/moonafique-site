import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ClubError } from "./model";
import { appOrigin } from "./stripe-gateway";

export async function requireMember() {
  const { user } = await withAuth();
  if (!user) throw new ClubError("sign_in_required", 401);
  return { id: user.id, email: user.email };
}
export function assertStaff(id: string) {
  const allowed = (process.env.GRIM_STAFF_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!allowed.includes(id)) throw new ClubError("staff_only", 403);
}
export async function requireStaff() {
  const user = await requireMember();
  assertStaff(user.id);
  return user;
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin())
    throw new ClubError("invalid_origin", 403);
}
const messages: Record<string, string> = {
  color_preferences_required: "Choose six preferred colors before continuing.",
  shipping_unavailable:
    "Shipping quotes are temporarily unavailable. Please try again shortly.",
  shipping_quote_failed:
    "We could not get a shipping rate for this address. Check the address or contact Moonafique.",
  shipping_quote_required: "Calculate shipping before continuing to payment.",
  shipping_quote_expired:
    "This shipping quote has expired. Calculate shipping again before continuing.",
  shipping_rate_limited:
    "Too many shipping quotes. Please try again in an hour.",
  shipping_label_exists:
    "A label purchase is already recorded or under review. Refresh the order before continuing.",
  shipping_purchase_review:
    "The label purchase needs review in Shippo. Do not buy another label until its outcome is confirmed.",
  shipping_address_changed:
    "The packing address changed. Refresh the order and calculate shipping again.",
  shipping_rate_changed:
    "The selected shipping price changed. Refresh the quote before purchasing.",
  shipping_transaction_mismatch:
    "That Shippo transaction does not match this order and its selected rate.",
  interest_unavailable:
    "The interest list is temporarily unavailable. Please try again shortly.",
  interest_rate_limited: "Too many attempts. Please try again in an hour.",
  sign_in_required: "Sign in to manage your Grimmunity membership.",
  staff_only: "This page is for Moonafique staff.",
  enrollment_closed:
    "Enrollment is closed. Check the next opening on the Grimmunity page.",
  tiers_not_ready:
    "The membership offer is still being finalized. Enrollment is not available yet.",
  membership_unavailable:
    "That membership is not available. Reload the club page to see the current offer.",
  shipping_not_ready:
    "The monthly shipping fee is still being finalized. Enrollment is not available yet.",
  checkout_tier_conflict:
    "You have an unfinished checkout for a different tier. Return to that tier to resume, or wait for its checkout to expire before choosing another.",
  sold_out: "This subscriber edition is full. No payment was taken.",
  already_member:
    "You already have a Grimmunity membership. Open your account to manage it.",
  checkout_needs_review:
    "Your earlier checkout is being checked. Please try again later or contact Moonafique before starting another checkout.",
  checkout_expired:
    "This checkout has expired. Return to Grimmunity to check availability.",
  unsupported_destination: "Delivery is not available to that destination.",
  terms_changed:
    "The offer has changed. Reload this page and review the terms.",
  order_not_ready:
    "This order needs payment, address, or exception review before packing or shipping.",
  address_window_open:
    "The address-change window is still open. Lock packing after the displayed deadline.",
};
export function failure(error: unknown) {
  const invalid = error instanceof z.ZodError || error instanceof SyntaxError;
  const status =
    error instanceof ClubError ? error.status : invalid ? 400 : 503;
  const code =
    error instanceof ClubError
      ? error.code
      : invalid
        ? "invalid_request"
        : "service_unavailable";
  // Never return Stripe objects, credentials, stack traces, or delivery addresses in errors.
  return NextResponse.json(
    {
      error:
        messages[code] ??
        (invalid
          ? "Check the form fields and try again."
          : "This action is unavailable. Please try again or contact Moonafique."),
      code,
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export async function jsonAction(
  request: Request,
  staff: boolean,
  work: (user: { id: string; email: string }) => Promise<unknown>,
) {
  try {
    sameOrigin(request);
    const user = await (staff ? requireStaff() : requireMember());
    return NextResponse.json(await work(user), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return failure(error);
  }
}
