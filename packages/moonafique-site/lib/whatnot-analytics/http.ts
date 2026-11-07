import { AnalyticsError } from "./api";
import { ClubError } from "../grimmunity/model";

export const privateHeaders = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" };
export function analyticsFailure(error: unknown) {
  if (error instanceof SyntaxError) error = new AnalyticsError("invalid_request");
  const status = error instanceof ClubError ? error.status : error instanceof AnalyticsError && error.code === "invalid_request" ? 400 : 503;
  const code = error instanceof ClubError ? error.code : error instanceof AnalyticsError ? error.code : "unavailable";
  const messages: Record<string, string> = {
    sign_in_required: "Sign in to continue.", staff_only: "This tool is for Moonafique staff.", invalid_origin: "This request could not be verified.",
    configuration: "The analytics connection is not configured.", authorization: "Check the analytics token’s Read Reports and Write Reports permissions and expiration.",
    account: "The analytics connection does not match the Moonafique account.", rate_limit: "Whatnot is limiting requests. Wait a few minutes, then try again.",
    report_failed: "Whatnot could not complete a report. Your last successful import is still available.", invalid_request: "Check the requested filters and try again.",
    response: "The new report could not be validated. Your last successful import is still available.",
  };
  return Response.json({ error: messages[code] ?? "The reports are temporarily unavailable. Your last successful import is preserved.", code }, { status, headers: privateHeaders });
}
