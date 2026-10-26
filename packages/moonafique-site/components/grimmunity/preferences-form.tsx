"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ColorPreferences } from "@/lib/grimmunity/preferences";
export function PreferencesForm({
  id,
  preferences,
}: {
  id: string;
  preferences?: ColorPreferences | null;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <details className="mt-5 rounded-2xl border p-5">
      <summary className="cursor-pointer font-bold">
        Your color preferences
      </summary>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (pending) return;
          const form = new FormData(event.currentTarget);
          setPending(true);
          setError("");
          try {
            const response = await fetch("/api/grimmunity/preferences", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                membershipId: id,
                preferences: {
                  preferred_colors: Array.from({ length: 6 }, (_, n) =>
                    String(form.get(`color_${n}`) ?? "").trim(),
                  ),
                  avoided_colors: String(form.get("avoided_colors") ?? "")
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean),
                },
              }),
            });
            if (!response.ok) throw new Error((await response.json()).error);
            router.refresh();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to save your preferences.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <p className="text-sm">
          Changes apply to future paid editions. Already-paid orders keep the
          preferences saved with their payment.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, n) => (
            <label key={n} className="text-sm">
              Preferred color {n + 1}
              <Input
                name={`color_${n}`}
                required
                maxLength={40}
                defaultValue={preferences?.preferred_colors[n]}
              />
            </label>
          ))}
        </div>
        <label className="block text-sm">
          Colors to avoid (separated by commas)
          <Input
            name="avoided_colors"
            maxLength={800}
            defaultValue={preferences?.avoided_colors.join(", ")}
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-800">
            {error}
          </p>
        )}
        <Button disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </form>
    </details>
  );
}
