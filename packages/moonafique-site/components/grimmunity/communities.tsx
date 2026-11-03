import Link from "next/link";
import { ArrowRight, Moon, Palette, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { membershipTiers, tierClub } from "@/lib/grimmunity/tiers";
import { collectionPages } from "@/lib/grimmunity/collections";
import { money } from "@/lib/grimmunity/model";
import { ClubShell } from "./views";

export function CommunitiesView() {
  return (
    <ClubShell active="communities">
      <header className="max-w-3xl pb-10 sm:pb-14">
        <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-primary">
          Moonafique memberships
        </p>
        <h1 className="text-5xl leading-[1.08] sm:text-6xl">
          Find your kind
          <br />
          of collection.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
          Collectible characters and original art, with something new each
          month. Choose the collection you want to spend more time with.
        </p>
      </header>
      <div className="grid gap-7 lg:grid-cols-2">
        {(["grimm", "aceo"] as const).map((club) => {
          const grimm = club === "grimm";
          const { name, href } = collectionPages[club];
          const Icon = grimm ? Moon : Palette;
          return (
            <article
              key={club}
              className="flex flex-col overflow-hidden rounded-[2rem] border border-border bg-card shadow-soft"
            >
              <div
                className={`flex min-h-44 items-center justify-between gap-6 p-7 sm:p-9 ${grimm ? "bg-[#292035] text-[#f7eefc]" : "bg-[#f0e7db] text-[#4b344f]"}`}
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em]">
                    {grimm
                      ? "A growing cast of characters"
                      : "Original art on a smaller scale"}
                  </p>
                  <h2 className="mt-3 text-4xl sm:text-5xl">{name}</h2>
                </div>
                <Icon
                  aria-hidden
                  className="size-14 shrink-0 opacity-80 sm:size-16"
                  strokeWidth={1.2}
                />
              </div>
              <div className="flex flex-1 flex-col p-7 sm:p-9">
                <p className="max-w-md leading-7 text-muted-foreground">
                  {grimm
                    ? "Mystery Grimms with accessories and matching pets, or Keepers with exclusive painted finishes. Meet the next addition to your collection."
                    : "Two prints or one original artwork each month. ACEOs measure just 2.5 by 3.5 inches: small enough to collect, with plenty to look at."}
                </p>
                <dl className="my-7 divide-y divide-border border-y border-border">
                  {membershipTiers
                    .filter((tier) => tierClub(tier) === club)
                    .map((tier) => (
                      <div
                        key={tier.id}
                        className="flex flex-wrap items-baseline justify-between gap-2 py-4"
                      >
                        <dt className="font-bold">{tier.name}</dt>
                        <dd>
                          <span className="text-2xl font-bold">
                            {money({ amount: tier.amount, currency: "usd" })}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            / month + shipping
                          </span>
                        </dd>
                      </div>
                    ))}
                </dl>
                <Button
                  asChild
                  className="mt-auto h-auto min-h-12 w-full whitespace-normal rounded-full py-3"
                >
                  <Link href={href}>
                    Explore {name} <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      <section
        className="mt-10 flex flex-col gap-4 rounded-3xl border border-primary/15 bg-surface p-7 sm:flex-row sm:p-9"
        aria-labelledby="collect-together"
      >
        <PackageCheck aria-hidden className="size-6 shrink-0 text-primary" />
        <div>
          <h2 id="collect-together" className="text-2xl">
            Room for both?
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            You can join one Grimm membership and one ACEO membership. Each has
            its own billing schedule, monthly shipment, and shipping charge.
            Manage both in your account.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose monthly billing or pay for six or twelve months upfront.
            Shipping is charged for each monthly delivery.
          </p>
        </div>
      </section>
    </ClubShell>
  );
}
