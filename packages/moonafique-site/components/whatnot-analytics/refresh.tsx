"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Job = { id: string; status: "requesting" | "pending" | "ready" | "failed"; errorCode?: string | null };
export function RefreshReports({ initialJob }: { initialJob: Job | null }) {
  const [job, setJob] = useState(initialJob);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = job?.status === "pending" || job?.status === "requesting";
  const jobId = job?.id;
  useEffect(() => {
    if (!active || !jobId || !checking) return;
    let cancelled = false, attempts = 0;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (document.hidden) { timer = setTimeout(poll, 5000); return; }
      try {
        const response = await fetch("/admin/whatnot/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "poll", id: jobId }), signal: controller.signal, redirect: "error" });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) throw Error(result.error ?? "The refresh could not be checked.");
        if (!result.refresh) throw Error("This refresh is no longer available. Start a new refresh.");
        setJob(result.refresh);
        if (result.refresh.status === "ready") { router.refresh(); return; }
        if (result.refresh.status === "failed") { setError("Whatnot could not complete the import. Your last successful records are preserved."); return; }
        if (++attempts >= 24) { setChecking(false); return; }
        timer = setTimeout(poll, 5000);
      } catch (error) {
        if (!cancelled) { setError(error instanceof Error ? error.message : "The connection was interrupted. Check again shortly."); setChecking(false); }
      }
    };
    timer = setTimeout(poll, 1500);
    return () => { cancelled = true; controller.abort(); clearTimeout(timer); };
  }, [active, jobId, checking, router]);

  async function start() {
    setStarting(true); setError(""); setChecking(true);
    try {
      const response = await fetch("/admin/whatnot/refresh", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }), redirect: "error" });
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "The refresh could not be started.");
      if (!mounted.current) return;
      setJob(result.refresh);
      if (result.refresh?.status === "ready") router.refresh();
    } catch (error) { if (mounted.current) setError(error instanceof Error ? error.message : "Please try again."); }
    finally { if (mounted.current) setStarting(false); }
  }
  return <div className="max-w-md">
    <Button onClick={active && !checking ? () => { setError(""); setChecking(true); } : start} disabled={starting || (!!active && checking)} variant="outline" className="min-h-11 gap-2 rounded-full border-primary/25 bg-white">
      <RefreshCw aria-hidden="true" className={`size-4 ${starting || (active && checking) ? "animate-spin" : ""}`} />
      {starting ? "Requesting reports…" : active ? checking ? "Refreshing records…" : "Check report progress" : "Refresh from Whatnot"}
    </Button>
    <p role="status" className="mt-2 text-xs leading-5 text-muted-foreground">{active ? "Whatnot is preparing the reports. Your saved dashboard stays available while they finish." : "Imports reports only. Orders, inventory, and payouts are unchanged."}</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-800">{error}</p>}
  </div>;
}
