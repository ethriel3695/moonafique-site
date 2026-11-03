import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Palette, Moon, Shapes } from "lucide-react";
import { Hero } from "@/components/hero";
import { MadeAtMoonafique } from "@/components/made-at-moonafique";
import { Testimonials } from "@/components/testimonials";
import { FAQ } from "@/components/faq";
import { EmailSignupForm } from "@/components/email-signup-form";
import { socialLinks, whatnotUrl } from "@/lib/site-content";

const collections = [
  {
    name: "Grimms & their worlds",
    description:
      "Meet the characters, explore past editions, and find out about our monthly Grimm memberships.",
    href: "/grimmunity",
    link: "Explore Grimmunity",
    icon: Moon,
  },
  {
    name: "Original art, up close",
    description:
      "ACEOs are artworks measuring 2.5 by 3.5 inches. Discover our original art and monthly print and original-art memberships.",
    href: "/aceos",
    link: "Explore ACEO memberships",
    icon: Palette,
  },
  {
    name: "Ideas that became things",
    description:
      "A glowing battle bot. A horned lyre. A whole scene built piece by piece. Take a look through our finished projects.",
    href: "/creations",
    link: "Visit the showcase",
    icon: Shapes,
  },
];

export function Homepage({
  catalog,
  newsletter,
}: {
  catalog: ReactNode;
  newsletter?: ReactNode;
}) {
  return (
    <>
      <Hero />
      <section
        id="collections"
        aria-labelledby="collections-title"
        className="scroll-mt-24 border-y border-border/70 bg-surface/70 px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-screen-xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            Find a thread to follow
          </p>
          <h2 id="collections-title" className="mt-4 text-4xl sm:text-5xl">
            There’s a story in every collection.
          </h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {collections.map(
              ({ name, description, href, link, icon: Icon }) => (
                <article
                  key={href}
                  className="flex flex-col rounded-2xl border border-border/80 bg-background p-6 sm:p-7"
                >
                  <Icon
                    className="size-7 text-primary"
                    strokeWidth={1.3}
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 text-2xl">{name}</h3>
                  <p className="mb-6 mt-3 leading-7 text-muted-foreground">
                    {description}
                  </p>
                  <Link
                    href={href}
                    className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline-offset-4 hover:underline"
                  >
                    {link}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </article>
              ),
            )}
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Membership pages show the current offers and enrollment status.
            Looking for an individual piece? Browse the shop or find us live on
            Whatnot.
          </p>
        </div>
      </section>
      <div id="showcase" className="scroll-mt-24">
        <MadeAtMoonafique />
      </div>
      <div className="mx-auto max-w-screen-xl px-5 pb-10 sm:px-8">
        <Link
          href="/creations"
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline underline-offset-4"
        >
          More from the Moonafique showcase{" "}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <section
        id="shop"
        aria-labelledby="shop-title"
        className="scroll-mt-24 border-t border-border/70 px-5 py-14 sm:px-8 sm:py-16"
      >
        <div className="mx-auto max-w-screen-xl">
          <div className="mb-9 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
              The shop
            </p>
            <h2 id="shop-title" className="mt-4 text-4xl sm:text-5xl">
              Something for your collection.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Browse the current shop selection. Each listing shows its
              availability, price, and whether it’s printed to order.
            </p>
          </div>
          {catalog}
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            Our 3D prints are collectible display pieces. Handle delicate parts
            with care, keep them away from high heat, and supervise children.
            Not suitable for children under three.
          </p>
        </div>
      </section>
      <section
        id="follow"
        aria-labelledby="follow-title"
        className="scroll-mt-24 bg-[#2b2035] px-5 py-14 text-[#f8f0fc] sm:px-8 sm:py-16"
      >
        <div className="mx-auto grid max-w-screen-xl gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d6b9eb]">
              Beyond the finished piece
            </p>
            <h2
              id="follow-title"
              className="mt-5 text-4xl leading-tight sm:text-5xl"
            >
              See what happens
              <br />
              at the worktable.
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-[#e3d6ec]">
              Paint in progress, details you might have missed, and the
              occasional experiment. Follow the work as it takes shape.
            </p>
            <a
              href={whatnotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-[#f8f0fc] underline underline-offset-4"
            >
              See our Whatnot profile and upcoming shows{" "}
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <nav
            aria-label="Follow Moonafique"
            className="grid content-start gap-3"
          >
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start justify-between gap-5 rounded-2xl border border-white/20 px-6 py-5 transition-colors hover:bg-white/5"
              >
                <div>
                  <span className="text-xl font-semibold">{link.name}</span>
                  <p className="mt-2 text-sm leading-6 text-[#e3d6ec]">
                    {link.detail}
                  </p>
                </div>
                <ArrowUpRight
                  className="mt-1 size-5 shrink-0 text-[#d6b9eb]"
                  aria-hidden="true"
                />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </nav>
        </div>
      </section>
      <Testimonials />
      <FAQ />
      <section
        className="px-5 pb-16 sm:px-8 sm:pb-20"
        aria-labelledby="newsletter-title"
      >
        <div className="mx-auto max-w-screen-xl rounded-[2rem] bg-primary px-6 py-10 text-primary-foreground sm:px-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em]">
              Moonafique, in your inbox
            </p>
            <h2 id="newsletter-title" className="mt-4 text-4xl sm:text-5xl">
              Keep an eye on what’s next.
            </h2>
            <p className="mb-7 mt-5 text-lg leading-8">
              New work, collection stories, and upcoming shows. Occasional notes
              from the Moonafique studio.
            </p>
          </div>
          {newsletter ?? <EmailSignupForm />}
          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6">
            This is our general newsletter. Membership launch notifications have
            their own signup on the membership pages.{" "}
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy policy
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
