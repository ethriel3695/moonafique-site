"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function RetryCustomEmails() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const testKey = useRef<string | null>(null);
  async function retry(test = false) {
    setBusy(true); setMessage("");
    try {
      if (test) testKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/custom-requests/notifications", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: test ? "test" : "retry", ...(test ? { submissionKey: testKey.current } : {}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Email delivery is unavailable.");
      setMessage(result.skipped ? "Email delivery is disabled in this environment." : `${result.sent} email(s) sent. ${result.failures ?? 0} need another check.${test ? " Test messages go only to the configured staff inbox." : ""}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Email delivery is unavailable."); }
    finally { setBusy(false); }
  }
  return <div className="my-5 text-sm">
    <div className="flex flex-wrap gap-3">
      <button onClick={() => retry()} disabled={busy} className="min-h-11 rounded-full border px-5 py-2 font-semibold disabled:opacity-60">{busy ? "Checking email…" : "Retry pending emails"}</button>
      <button onClick={() => retry(true)} disabled={busy} className="min-h-11 rounded-full border px-5 py-2 font-semibold disabled:opacity-60">Send sample emails to staff inbox</button>
    </div>
    {message && <p role="status" className="mt-2">{message}</p>}
    <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">“Sent” means accepted by the email provider. Pending emails retry automatically. “Needs review” means delivery could not be confirmed safely; check the provider before sending another copy.</p>
  </div>;
}
