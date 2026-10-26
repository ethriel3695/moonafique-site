import Link from "next/link";
import { JoinForm } from "@/components/grimmunity/actions";
import { notFound } from "next/navigation";
import {
  AccountContent,
  ClubShell,
  OfferView,
  SandboxBanner,
  StaffOrders,
  Status,
} from "@/components/grimmunity/views";
import {
  reviewAccount,
  reviewEdition,
  reviewProgram,
  reviewStaff,
} from "@/lib/grimmunity/review-fixture";
export const dynamic = "force-dynamic";
export default async function Review({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.GRIM_REVIEW_UI !== "true"
  )
    notFound();
  const { screen } = await searchParams;
  const tabs = (
    <nav
      className="mx-auto flex max-w-screen-xl flex-wrap gap-4 px-6 pt-6 text-sm font-bold"
      aria-label="Fixture screens"
    >
      {["offer", "join", "account", "canceled", "staff"].map((s) => (
        <Link
          className="rounded-full border px-4 py-2 underline"
          key={s}
          href={`/grimmunity/review?screen=${s}`}
        >
          {s}
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      {tabs}
      {screen === "join" ? (
        <ClubShell>
          <SandboxBanner fixture />
          <h1 className="mb-6 text-4xl">Join form review</h1>
          <div className="rounded-3xl border bg-card p-7">
            <p className="mb-5 text-sm">
              Local form review. The real endpoint still requires authentication
              and valid sandbox configuration.
            </p>
            <JoinForm
              tiers={reviewProgram.tiers}
              currency={reviewProgram.currency}
              termsVersion={reviewProgram.terms_version}
              countries={reviewProgram.countries}
              sandbox
              fixture
            />
          </div>
        </ClubShell>
      ) : screen === "staff" ? (
        <ClubShell>
          <SandboxBanner fixture />
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-primary">
            Moonafique staff
          </p>
          <h1 className="text-4xl sm:text-5xl">November packing list</h1>
          <p className="my-5 max-w-3xl leading-7">
            Two paid obligations. One address is locked and ready to pack; the
            other needs delivery information. Only ready orders belong in the
            export.
          </p>
          <div className="mb-6 flex gap-3">
            <Status>1 ready to pack</Status>
            <Status>1 needs address</Status>
          </div>
          <StaffOrders orders={reviewStaff} fixture />
        </ClubShell>
      ) : screen === "account" || screen === "canceled" ? (
        <ClubShell>
          <SandboxBanner fixture />
          <AccountContent
            fixture
            view={
              screen === "canceled"
                ? {
                    ...reviewAccount,
                    membership: {
                      ...reviewAccount.membership!,
                      cancel_at_period_end: true,
                    },
                  }
                : reviewAccount
            }
          />
        </ClubShell>
      ) : (
        <OfferView
          fixture
          program={reviewProgram}
          edition={reviewEdition}
          now={new Date("2026-11-02T18:00:00Z")}
        />
      )}
    </>
  );
}
