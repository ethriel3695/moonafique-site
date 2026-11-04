import { Resend, type ErrorResponse } from "resend";
import { ClubError } from "./grimmunity/model";

function alreadySaved(error: ErrorResponse) {
  return error.statusCode === 409 || /already (exists|in)/i.test(error.message);
}

export async function activateNewsletter(email: string) {
  const { RESEND_API_KEY: key, RESEND_NEWSLETTER_SEGMENT_ID: segmentId } = process.env;
  if (process.env.NEWSLETTER_SEND_EMAILS !== "approved" || !key || !segmentId)
    throw new ClubError("interest_unavailable", 503);

  const resend = new Resend(key);
  const current = await resend.contacts.get({ email });
  if (current.data?.unsubscribed) throw new ClubError("newsletter_opted_out", 409);
  if (current.error && current.error.statusCode !== 404) throw new ClubError("interest_unavailable", 503);
  if (!current.data) {
    const created = await resend.contacts.create({ email, segments: [{ id: segmentId }] });
    if (created.data && !created.error) return;
    if (!created.error || !alreadySaved(created.error)) throw new ClubError("interest_unavailable", 503);
    // A different writer created the contact. Respect its latest suppression state.
    const existing = await resend.contacts.get({ email });
    if (!existing.data || existing.error) throw new ClubError("interest_unavailable", 503);
    if (existing.data.unsubscribed) throw new ClubError("newsletter_opted_out", 409);
  }
  const { data, error } = await resend.contacts.segments.add({ email, segmentId });
  if ((!data && !error) || (error && !alreadySaved(error))) throw new ClubError("interest_unavailable", 503);
}
