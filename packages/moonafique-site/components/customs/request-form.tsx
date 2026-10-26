"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { requestInput } from "@/lib/customs/model";

const field = "mt-2 block w-full rounded-xl border border-[#4c326d]/20 bg-white px-4 py-3 text-base text-[#30263b] shadow-sm outline-none focus:border-[#704a91] focus:ring-2 focus:ring-[#704a91]/20";

export function CustomRequestForm() {
  const [hasDeadline, setHasDeadline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ reference?: string; hasEmail: boolean } | null>(null);
  const submissionKey = useRef<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    const fields = new FormData(event.currentTarget);
    submissionKey.current ??= crypto.randomUUID();
    const parsed = requestInput.safeParse({
      submissionKey: submissionKey.current,
      name: fields.get("name"), email: fields.get("email"), whatnotUsername: fields.get("whatnotUsername"),
      request: fields.get("request"), details: fields.get("details"), hasDeadline,
      neededBy: fields.get("neededBy") ?? "", occasion: fields.get("occasion") ?? "",
      acknowledged: fields.get("acknowledged") === "yes", website: fields.get("website"),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your form and try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/custom-requests", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "We couldn’t save your request. Please try again.");
      setSaved({ reference: result.reference, hasEmail: !!parsed.data.email });
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "We couldn’t save your request. Please try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { setSaving(false); }
  }

  if (saved) return (
    <div ref={successRef} tabIndex={-1} role="status" className="rounded-3xl border border-[#4c326d]/15 bg-white p-7 shadow-sm outline-none sm:p-10">
      <CheckCircle2 className="mb-6 size-10 text-[#4c326d]" aria-hidden="true" />
      <h2 className="font-display text-3xl">Your idea is in our queue.</h2>
      <p className="mt-4 leading-7">Thanks for sharing it with Moonafique! We work through custom requests in the order they’re received and will use your contact details to discuss your idea.</p>
      <p className="mt-4 text-sm leading-6 text-[#665b70]">Your requested date is for our information only. It does not move your request ahead in the queue or mean we’ve agreed to complete or deliver an order by that date. Submitting does not guarantee acceptance or completion.</p>
      {saved.hasEmail && <p className="mt-4 text-sm leading-6">A confirmation email will be sent to the address you provided. If it doesn’t arrive, check your spam folder.</p>}
      {saved.reference && <p className="mt-5 break-all text-xs text-[#665b70]">Keep this reference: {saved.reference}</p>}
      <Link href="/#showcase" className="mt-8 inline-flex min-h-11 items-center gap-2 font-bold text-[#4c326d] underline underline-offset-4">Back to our creations <ArrowRight className="size-4" aria-hidden="true" /></Link>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-8 rounded-3xl border border-[#4c326d]/15 bg-white p-6 shadow-sm sm:p-9" aria-label="Custom request">
      <div className="absolute -left-[10000px]" aria-hidden="true">
        <label>Leave this blank<input name="website" tabIndex={-1} autoComplete="off" maxLength={200} /></label>
      </div>
      <fieldset disabled={saving} className="space-y-6">
        <legend className="mb-5 font-display text-2xl">First, a way to reach you</legend>
        <label className="block text-sm font-semibold">Your name <span className="font-normal text-[#665b70]">(required)</span>
          <input className={field} name="name" autoComplete="name" required maxLength={120} />
        </label>
        <p id="contact-help" className="text-sm leading-6 text-[#665b70]">Add an email address or your Whatnot username. Either one is enough; you can include both.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Email address
            <input className={field} name="email" type="email" autoComplete="email" maxLength={254} aria-describedby="contact-help" />
          </label>
          <label className="block text-sm font-semibold">Whatnot username
            <input className={field} name="whatnotUsername" autoCapitalize="none" spellCheck={false} maxLength={81} aria-describedby="contact-help" placeholder="@yourusername" />
          </label>
        </div>
      </fieldset>
      <fieldset disabled={saving} className="space-y-6 border-t border-[#4c326d]/10 pt-7">
        <legend className="float-left mb-5 w-full font-display text-2xl">Tell us what you’re imagining</legend>
        <label className="block clear-both text-sm font-semibold">Your request <span className="font-normal text-[#665b70]">(required)</span>
          <textarea className={field} name="request" rows={4} required minLength={10} maxLength={3000} placeholder="What would you love us to create?" />
        </label>
        <label className="block text-sm font-semibold">Additional details <span className="font-normal text-[#665b70]">(optional)</span>
          <textarea className={field} name="details" rows={3} maxLength={4000} placeholder="Colors, size, style, or anything else that will help us understand your idea." />
        </label>
      </fieldset>
      <fieldset disabled={saving} className="space-y-5 border-t border-[#4c326d]/10 pt-7">
        <legend className="float-left mb-5 w-full font-display text-2xl">Is there a date in mind?</legend>
        <label className="flex clear-both cursor-pointer items-start gap-3 text-sm leading-6">
          <input className="mt-1 size-4 shrink-0 accent-[#4c326d]" type="checkbox" checked={hasDeadline} onChange={(e) => setHasDeadline(e.target.checked)} aria-controls="custom-deadline" />
          I have a date or occasion to share.
        </label>
        {hasDeadline && <div id="custom-deadline" className="space-y-5 rounded-2xl bg-[#f6f2fa] p-5">
          <label className="block text-sm font-semibold">Requested date <span className="font-normal text-[#665b70]">(required)</span>
            <input className={`${field} min-w-0 max-w-full`} type="date" name="neededBy" required aria-describedby="date-help" />
          </label>
          <label className="block text-sm font-semibold">What’s the occasion? <span className="font-normal text-[#665b70]">(optional)</span>
            <input className={field} name="occasion" maxLength={300} placeholder="A birthday, a gift, a special event…" />
          </label>
          <p id="date-help" className="text-sm leading-6 text-[#665b70]">This date is for our information only. It is not a promise or agreement to complete or deliver an order by that date. We work through requests in the order received; a requested date does not move you ahead in the queue.</p>
        </div>}
      </fieldset>
      <div className="space-y-5 border-t border-[#4c326d]/10 pt-6">
        <label className="flex items-start gap-3 text-sm leading-6">
          <input className="mt-1 size-4 shrink-0 accent-[#4c326d]" type="checkbox" name="acknowledged" value="yes" required disabled={saving} />
          I understand that requests are handled in the order received. My requested date is for information only and does not guarantee acceptance, completion, or delivery by that date.
        </label>
        <p className="text-xs leading-5 text-[#665b70]">We’ll use these details to review and discuss your request, and send a confirmation if you provide an email. You won’t be added to a mailing list. <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link></p>
        {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-900 outline-none">{error}</p>}
        <button type="submit" disabled={saving} className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-[#4c326d] px-7 py-3 text-sm font-bold text-white transition-colors hover:bg-[#38244f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4c326d] disabled:opacity-60 sm:w-auto">
          {saving ? "Saving your request…" : "Send custom request"}<ArrowRight className="size-4" aria-hidden="true" />
        </button>
        <p className="text-xs text-[#665b70]">No payment is taken when you submit.</p>
      </div>
    </form>
  );
}
