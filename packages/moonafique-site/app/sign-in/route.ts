import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { signInReturnPath } from "@/lib/sign-in-return";

export const GET = async (request: Request) => {
  const returnTo = signInReturnPath(new URL(request.url).searchParams.get("returnTo"));
  return redirect(await getSignInUrl({ returnTo }));
};
