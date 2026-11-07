import { z } from "zod";
import { requireStaff, sameOrigin } from "@/lib/grimmunity/http";
import { database } from "@/lib/grimmunity/db";
import { WhatnotReports, AnalyticsError } from "@/lib/whatnot-analytics/api";
import { startRefresh, collectRefresh, publicRefresh } from "@/lib/whatnot-analytics/store";
import { analyticsFailure, privateHeaders } from "@/lib/whatnot-analytics/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
const input = z.discriminatedUnion("action", [z.object({ action: z.literal("start") }).strict(), z.object({ action: z.literal("poll"), id: z.uuid() }).strict()]);
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const staff = await requireStaff();
    const result = input.safeParse(await request.json());
    if (!result.success) throw new AnalyticsError("invalid_request");
    const api = new WhatnotReports(process.env.WHATNOT_ANALYTICS_API_TOKEN?.trim() ?? "");
    const refresh = result.data.action === "start" ? await startRefresh(database(), api, staff.id) : await collectRefresh(database(), api, result.data.id);
    return Response.json({ refresh: publicRefresh(refresh) }, { headers: privateHeaders });
  } catch (error) { return analyticsFailure(error); }
}
