import { requestEmailOptIn } from "@/lib/grimmunity/email-opt-in-http";

export const runtime = "nodejs";
export const maxDuration = 30;
export function POST(request: Request) {
  return requestEmailOptIn(request, "launch");
}
