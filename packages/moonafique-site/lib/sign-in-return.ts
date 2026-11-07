const allowedPaths = new Set(["/communities", "/grimmunity", "/aceos", "/account/grimmunity", "/admin/whatnot", "/admin/whatnot/costs"]);

export function signInReturnPath(requested: string | null): string | undefined {
  if (!requested?.startsWith("/") || requested.startsWith("//")) return undefined;
  try {
    const url = new URL(requested, "https://moonafique.invalid");
    if (url.origin !== "https://moonafique.invalid") return undefined;
    const path = url.pathname === "/grim-club" ? "/grimmunity" : url.pathname === "/account/grim-club" ? "/account/grimmunity" : url.pathname;
    if (!allowedPaths.has(path)) return undefined;
    return `${path}${["/grimmunity", "/aceos"].includes(path) && url.searchParams.get("resume") === "membership" ? "?resume=membership" : ""}`;
  } catch { return undefined; }
}

export function membershipSignInUrl(path: "/grimmunity" | "/aceos") {
  return `/sign-in?returnTo=${encodeURIComponent(`${path}?resume=membership`)}`;
}
