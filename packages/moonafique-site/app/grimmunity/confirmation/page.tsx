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
  let result:
    | {
        complete: boolean;
        paid: boolean;
        invoiceUrl?: string | null;
        managed?: boolean;
        paymentDeadline?: string | null;
      }
    | undefined;
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
            : result?.invoiceUrl
              ? "Your first collection is almost yours."
              : result?.complete
                ? "Your payment is being confirmed."
                : "We could not confirm this checkout."}
        </h1>
        <p role="status" className="my-6 leading-7">
          {result?.paid
            ? "Your paid edition is saved in your account. You can review dispatch dates and manage delivery details there."
            : result?.invoiceUrl
              ? "Your card is saved. Review the membership, first month’s shipping, and tax on your Stripe invoice, then pay to confirm your first delivery. No payment was taken while saving your card."
              : result?.complete
                ? "Stripe has completed checkout. Your edition will appear when its paid invoice has been verified. You do not need to pay again."
                : "Open your account to check membership and payment status before trying another checkout."}
        </p>
        {result?.invoiceUrl && (
          <Button asChild className="mb-4 mr-4">
            <a href={result.invoiceUrl}>Review and pay first invoice</a>
          </Button>
        )}
        {result?.invoiceUrl && result.paymentDeadline && (
          <p className="mb-5 text-sm">
            Complete the first payment by{" "}
            {new Intl.DateTimeFormat("en-US", {
              timeZone: "America/Boise",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            }).format(new Date(result.paymentDeadline))}{" "}
            to keep this checkout reservation.
          </p>
        )}
        <Button asChild>
          <Link href="/account/grimmunity">View my membership</Link>
        </Button>
      </div>
    </ClubShell>
  );
}
