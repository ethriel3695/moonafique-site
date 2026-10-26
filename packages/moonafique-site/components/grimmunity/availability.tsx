"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  availabilityLabel,
  availabilitySnapshotSchema,
  type Tier,
  type TierAvailability,
} from "@/lib/grimmunity/tiers";

const AvailabilityContext = createContext<TierAvailability | null>(null);

export function MembershipAvailability({
  initial,
  editionId,
  fixture = false,
  children,
}: {
  initial: TierAvailability;
  editionId: string | null;
  fixture?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<{
    initial: TierAvailability;
    value: TierAvailability;
  } | null>(null);
  useEffect(() => {
    if (fixture) return;
    const controller = new AbortController();
    let busy = false;
    async function refresh() {
      if (document.visibilityState === "hidden" || busy) return;
      busy = true;
      try {
        const response = await fetch("/api/grimmunity/availability", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Availability unavailable");
        const result = availabilitySnapshotSchema.parse(await response.json());
        if (result.editionId !== editionId) {
          setSnapshot({ initial, value: {} });
          router.refresh();
        } else setSnapshot({ initial, value: result.availability });
      } catch {
        // Show total capacity rather than a stale remaining count after a failed refresh.
        if (!controller.signal.aborted) setSnapshot({ initial, value: {} });
      } finally {
        busy = false;
      }
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [initial, editionId, fixture, router]);
  return (
    <AvailabilityContext.Provider
      value={snapshot?.initial === initial ? snapshot.value : initial}
    >
      {children}
    </AvailabilityContext.Provider>
  );
}

export function useMembershipAvailability(fallback: TierAvailability) {
  return useContext(AvailabilityContext) ?? fallback;
}

export function AvailabilityBadge({
  tier,
  availability,
}: {
  tier: Pick<Tier, "id" | "member_cap" | "name">;
  availability?: TierAvailability;
}) {
  const current = useMembershipAvailability(availability ?? {});
  const label = availabilityLabel(tier, current[tier.id]);
  if (!label) return null;
  const full = current[tier.id]?.full || current[tier.id]?.remaining === 0;
  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${full ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}
    >
      <span className="sr-only">{tier.name}: </span>
      {label}
    </span>
  );
}
