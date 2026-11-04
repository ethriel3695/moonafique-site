"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

async function confirmFromLocation(): Promise<"launch" | "newsletter"> {
  // The fragment stays in the browser until the visitor explicitly confirms.
  const response = await fetch("/api/confirm-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: window.location.hash.slice(1) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  window.history.replaceState(null, "", window.location.pathname);
  return result.purpose;
}

export function ConfirmEmailForm({ confirm = confirmFromLocation }: { confirm?: () => Promise<"launch" | "newsletter"> }) {
  const [pending, setPending] = useState(false);
  const [confirmed, setConfirmed] = useState<"launch" | "newsletter" | null>(null);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      setConfirmed(await confirm());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn’t confirm your email. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (confirmed) return <p className="mt-6" role="status">{confirmed === "launch"
    ? "You’re on the membership launch list. We’ll email you when enrollment opens."
    : "Your email is confirmed. You’re on the Moonafique newsletter list."}</p>;

  return (
    <form className="mt-6" onSubmit={submit}>
      <Button type="submit" disabled={pending}>{pending ? "Confirming…" : "Confirm email"}</Button>
      {error && <p className="mt-4" role="alert">{error}</p>}
    </form>
  );
}
