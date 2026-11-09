"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Archive, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { editionQuantity, emptyShowcaseInventory, showcaseInventorySchema, type ShowcaseInventory } from "@/lib/grimmunity/showcase-inventory";
import { grimWhatnotUrl } from "@/lib/grimmunity/showcase";

const InventoryContext = createContext({ inventory: emptyShowcaseInventory, now: 0 });
export function ShowcaseInventoryProvider({ initialInventory, initialNow, children }: { initialInventory: ShowcaseInventory; initialNow: number; children?: ReactNode }) {
  const [inventory, setInventory] = useState(initialInventory);
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    let active = true;
    let pending = false;
    let lastAttempt = 0;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden) return;
      setNow(Date.now());
      if (pending || Date.now() - lastAttempt < 15_000) return;
      pending = true;
      lastAttempt = Date.now();
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 15_000);
      try {
        const response = await fetch("/api/grim-showcase", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const result = showcaseInventorySchema.safeParse(await response.json());
        if (!active || !result.success) return;
        // Unknown quantities explicitly clear the old count. Connection errors
        // retain the previous result only until its five-minute age limit.
        const next = result.data;
        if (next.syncedAt) setInventory(previous => !previous.syncedAt || Date.parse(next.syncedAt!) >= Date.parse(previous.syncedAt) ? next : previous);
      } catch { /* The age check hides stale stock even if requests keep failing. */ }
      finally { window.clearTimeout(timeout); pending = false; }
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return <InventoryContext.Provider value={{ inventory, now }}>{children}</InventoryContext.Provider>;
}

export function EditionAvailability({ edition, vaulted }: { edition: string; vaulted: boolean }) {
  const { inventory, now } = useContext(InventoryContext);
  const quantity = editionQuantity(inventory, edition, now);
  const soldOut = quantity === 0;
  return <>
    <div className="mt-4" aria-live="polite" aria-atomic="true">
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${vaulted || soldOut ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
        {vaulted || soldOut ? <Archive aria-hidden="true" className="size-3.5" /> : <Sparkles aria-hidden="true" className="size-3.5" />}
        {vaulted ? "Vaulted · sold out" : quantity === null ? "Check availability on Whatnot" : soldOut ? "Sold out on Whatnot" : `${quantity} left on Whatnot`}
      </span>
    </div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">
      {vaulted ? "This Whatnot-exclusive edition sold out and is now vaulted." : soldOut ? "This edition is currently sold out on Whatnot. Explore more of our Grimm world there." : quantity === null ? "Visit Moonafique on Whatnot for this edition’s current availability." : "Find this Whatnot-exclusive edition while it’s still available."}
    </p>
    {!vaulted && <Button asChild variant="outline" className="mt-5 w-full rounded-full">
      <a href={grimWhatnotUrl} target="_blank" rel="noopener noreferrer">{quantity !== null && quantity > 0 ? "Shop on Whatnot" : "Visit Moonafique on Whatnot"} <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only"> (opens in a new tab)</span></a>
    </Button>}
  </>;
}

export function InventoryRefreshNote({ editions }: { editions: string[] }) {
  const { inventory, now } = useContext(InventoryContext);
  const hasCurrentStock = editions.some(key => editionQuantity(inventory, key, now) !== null);
  return <p className="mt-5 text-xs leading-5 text-muted-foreground">{hasCurrentStock ? "Availability updates automatically from Whatnot every few minutes. Whatnot confirms stock when you buy." : "Check Whatnot for current availability. Remaining counts appear here when Whatnot provides them."}</p>;
}
