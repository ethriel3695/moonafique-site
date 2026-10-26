import { z } from "zod";
import { failure, requireStaff } from "@/lib/grimmunity/http";
import { club } from "@/lib/grimmunity/runtime";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const user = await requireStaff();
    const edition = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("edition"));
    return new Response(await club().packingCSV(user.id, edition), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="grim-packing-${edition}.csv"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
