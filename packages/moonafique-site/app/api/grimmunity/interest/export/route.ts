import { database } from "@/lib/grimmunity/db";
import { failure, requireStaff } from "@/lib/grimmunity/http";
import { interestCSV } from "@/lib/grimmunity/interest";
import { grimMode } from "@/lib/grimmunity/runtime";

export const runtime = "nodejs";
export async function GET() {
  try {
    await requireStaff();
    const rows = (await database().query(
      "SELECT email,created_at,consent_version FROM grim.interest WHERE mode=$1 ORDER BY created_at", [grimMode()],
    )).rows;
    return new Response(interestCSV(rows), { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="grimmunity-interest.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    return failure(error);
  }
}
