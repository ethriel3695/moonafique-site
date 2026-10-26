import { database } from "@/lib/grimmunity/db";
import { failure, jsonAction } from "@/lib/grimmunity/http";
import { club, grimMode } from "@/lib/grimmunity/runtime";
import { grimStripe } from "@/lib/grimmunity/stripe-gateway";
import { runWorker, workerAuthorized } from "@/lib/grimmunity/worker";
import { deliverCustomEmails } from "@/lib/customs/mail";

export const runtime = "nodejs";
export const maxDuration = 60;
async function run() {
  // Custom requests still receive backup delivery when membership billing is disabled.
  try { await deliverCustomEmails(database(), grimMode(), { limit: 4, deadline: Date.now() + 10_000 }); }
  catch { console.error("Custom request email backup needs attention."); }
  if (!process.env.GRIM_STRIPE_SECRET_KEY) return { skipped: "billing_not_configured" };
  const mode = grimMode(), stripe = grimStripe(mode);
  return runWorker(database(), mode, club(), async (customer) =>
    (await stripe.invoices.list({ customer, status: "paid", limit: 2 })).data.map((invoice) => invoice.id),
  );
}
export async function GET(request: Request) {
  if (!workerAuthorized(request.headers.get("authorization")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await run(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  return jsonAction(request, true, run);
}
