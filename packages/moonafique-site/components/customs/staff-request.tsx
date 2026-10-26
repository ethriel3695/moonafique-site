"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { statusLabels, type RequestStatus } from "@/lib/customs/model";

export function StaffRequest({ id, revision, status, notes }: { id: string; revision: number; status: RequestStatus; notes: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const fields = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/custom-requests/manage", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revision, status: fields.get("status"), staffNotes: fields.get("staffNotes") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Couldn’t save this request.");
      setSaved(true); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Couldn’t save this request."); }
    finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t pt-5" aria-label="Update request">
      <label className="block text-sm font-semibold">Status
        <select name="status" defaultValue={status} className="mt-2 block w-full rounded-xl border bg-white p-3" disabled={saving}>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Internal notes
        <textarea name="staffNotes" defaultValue={notes} maxLength={4000} rows={3} className="mt-2 block w-full rounded-xl border bg-white p-3 font-normal" disabled={saving} />
      </label>
      <p className="text-xs leading-5 text-muted-foreground">Status and notes are staff-only. Saving does not contact the customer or confirm an order.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      {saved && <p role="status" className="text-sm text-green-800">Changes saved.</p>}
      <button disabled={saving} className="min-h-11 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save request"}</button>
    </form>
  );
}
