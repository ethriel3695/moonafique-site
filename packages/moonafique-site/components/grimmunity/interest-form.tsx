"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function InterestForm() {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "saving") return;
    const form = new FormData(event.currentTarget);
    setState("saving");
    setError("");
    try {
      const response = await fetch("/api/grimmunity/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          website: form.get("website"),
          consent: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Please try again.");
      setState("saved");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn’t save your email. Please try again.",
      );
      setState("error");
    }
  }
  return (
    <div id="interest-list" className="mt-6 scroll-mt-24">
      {state === "saved" ? (
        <div
          role="status"
          className="rounded-xl border border-primary/30 bg-primary/5 p-5"
        >
          <p className="font-bold">You’re on the interest list.</p>
          <p className="mt-2 text-sm leading-6">
            We’ll email you when Moonafique membership enrollment opens. No
            payment was taken, and no membership is reserved.
          </p>
          <p className="mt-2 text-sm leading-6">
            New signups receive a confirmation email. If it doesn’t arrive in a
            few minutes, check your spam folder or contact us. Signing up again
            won’t send another confirmation.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label
            htmlFor="grim-interest-email"
            className="block text-sm font-bold"
          >
            Email address
          </label>
          <input
            id="grim-interest-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            aria-describedby="grim-interest-consent"
            className="mt-2 w-full rounded-xl border bg-background p-3"
          />
          <div hidden aria-hidden="true">
            <label>
              Website
              <input name="website" autoComplete="off" tabIndex={-1} />
            </label>
          </div>
          <p
            id="grim-interest-consent"
            className="mt-3 text-xs leading-5 text-muted-foreground"
          >
            By joining, you agree to receive a confirmation email and a
            Moonafique membership launch email from Moonafique. This won’t sign
            you up for our general newsletter. No account or payment needed, and
            no membership is reserved.
          </p>
          <Button
            type="submit"
            disabled={state === "saving"}
            className="mt-4 w-full"
          >
            {state === "saving" ? "Saving…" : "Email me when enrollment opens"}
          </Button>
          {state === "error" && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        This shared launch list covers Grimm and ACEO memberships. Changed your
        mind?{" "}
        <a
          className="underline"
          href="mailto:hello@moonafique.com?subject=Remove%20me%20from%20the%20Grimmunity%20interest%20list"
        >
          Ask us to remove your email
        </a>
        .{" "}
        <Link className="underline" href="/privacy">
          Privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
