import Link from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ClubShell } from "@/components/grimmunity/views";
import { Button } from "@/components/ui/button";
import { club } from "@/lib/grimmunity/runtime";
export const dynamic = "force-dynamic";
export default async function Confirmation({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });
  const { session_id } = await searchParams;
  let result: { complete: boolean; paid: boolean } | undefined;
  try {
    if (session_id && session_id.length < 255)
      result = await club().confirmation(user.id, session_id);
  } catch {}
  return (
    <ClubShell>
      <div className="mx-auto max-w-2xl rounded-[2rem] border bg-card p-8 sm:p-12">
        <p className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">
          Your Moonafique membership
        </p>
        <h1 className="text-4xl">
          {result?.paid
            ? "Your first edition is confirmed."
            : result?.complete
              ? "Your payment is being confirmed."
              : "We could not confirm this checkout."}
        </h1>
        <p role="status" className="my-6 leading-7">
          {result?.paid
            ? "Your paid edition is saved in your account. You can review dispatch dates and manage delivery details there."
            : result?.complete
              ? "Stripe has completed checkout. Your edition will appear when its paid invoice has been verified. You do not need to pay again."
              : "Open your account to check membership and payment status before trying another checkout."}
        </p>
        <Button asChild>
          <Link href="/account/grimmunity">View my membership</Link>
        </Button>
      </div>
    </ClubShell>
  );
}
