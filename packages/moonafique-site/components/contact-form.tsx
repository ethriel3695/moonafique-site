"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { contactSchema, type ContactSubmission } from "@/lib/contact";
export async function sendContactMessage(data: ContactSubmission) {
  const response = await fetch("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok)
    throw new Error(
      result?.error || "We couldn’t send your message. Please try again.",
    );
}
export function ContactForm({
  submitMessage = sendContactMessage,
}: {
  submitMessage?: (data: ContactSubmission) => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const submission = useRef<{ payload: string; key: string } | null>(null);
  const submitting = useRef(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
      name: fields.get("name"),
      email: fields.get("email"),
      subject: fields.get("subject"),
      message: fields.get("message"),
      company: fields.get("company") ?? "",
    };
    const signature = JSON.stringify(payload);
    if (submission.current?.payload !== signature)
      submission.current = { payload: signature, key: crypto.randomUUID() };
    const parsed = contactSchema.safeParse({
      ...payload,
      submissionKey: submission.current!.key,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setState("error");
      return;
    }
    submitting.current = true;
    setState("sending");
    setError("");
    try {
      await submitMessage(parsed.data);
      setState("sent");
      form.reset();
      submission.current = null;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t send your message. Please try again.",
      );
      setState("error");
    } finally {
      submitting.current = false;
    }
  }
  if (state === "sent")
    return (
      <div
        role="status"
        className="rounded-2xl border border-primary/20 bg-surface p-7"
      >
        <h2 className="text-2xl">Your message has been sent.</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          Thanks for getting in touch. We’ll reply to the email address you
          provided.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => setState("idle")}
        >
          Send another message
        </Button>
      </div>
    );
  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Contact Moonafique"
      aria-busy={state === "sending"}
      className="space-y-5"
    >
      <fieldset disabled={state === "sending"} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact-name">Name</Label>
            <Input
              id="contact-name"
              name="name"
              autoComplete="name"
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-subject">Subject</Label>
          <Input id="contact-subject" name="subject" required maxLength={120} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-message">Message</Label>
          <Textarea
            id="contact-message"
            name="message"
            required
            maxLength={5000}
            className="min-h-44"
            aria-describedby="contact-privacy"
          />
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-company">Company</label>
          <input
            id="contact-company"
            name="company"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </fieldset>
      <p
        id="contact-privacy"
        className="text-sm leading-6 text-muted-foreground"
      >
        We’ll use these details to respond to your message. This does not
        subscribe you to a mailing list.{" "}
        <Link
          href="/privacy"
          className="text-primary underline underline-offset-4"
        >
          Privacy policy
        </Link>
      </p>
      {state === "error" && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm leading-6"
        >
          {error} You can also{" "}
          <a
            href="mailto:hello@moonafique.com"
            className="font-semibold text-primary underline"
          >
            email hello@moonafique.com
          </a>
          . Your message is still in the form.
        </p>
      )}
      <Button type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
