import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export const GET = async (request: Request) => {
  const requestedPath = new URL(request.url).searchParams.get("returnTo");
  const requested =
    requestedPath === "/grim-club"
      ? "/grimmunity"
      : requestedPath === "/account/grim-club"
        ? "/account/grimmunity"
        : requestedPath;
  const returnTo =
    requested &&
    ["/communities", "/grimmunity", "/aceos", "/account/grimmunity"].includes(
      requested,
    )
      ? requested
      : undefined;
  return redirect(await getSignInUrl({ returnTo }));
};
