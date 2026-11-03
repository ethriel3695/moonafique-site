import Link from "next/link";
import { brandDescription, socialLinks } from "@/lib/site-content";
const links = [
  { label: "Collections", href: "/#collections" },
  { label: "Shop", href: "/#shop" },
  { label: "The creations showcase", href: "/creations" },
  { label: "Monthly memberships", href: "/communities" },
  { label: "Custom requests", href: "/customs" },
  { label: "About Moonafique", href: "/about" },
  { label: "Contact", href: "/contact" },
];
const policies = [
  "Privacy",
  "Terms",
  "Cookies",
  "Refund",
  "Shipping",
  "Quality",
];
export function Footer() {
  return (
    <footer className="border-t border-primary/20 bg-[#2b2035] text-[#f8f0fc]">
      <div className="mx-auto grid max-w-screen-xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.3fr_1fr_0.7fr]">
        <div>
          <Link href="/" className="font-display text-3xl">
            Moonafique
          </Link>
          <p className="mt-5 max-w-md leading-7 text-[#e3d6ec]">
            {brandDescription}
          </p>
          <nav
            aria-label="Social profiles"
            className="mt-6 flex flex-wrap gap-3"
          >
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-4 text-sm font-semibold hover:bg-white/10"
              >
                {link.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ))}
          </nav>
        </div>
        <nav aria-label="Explore Moonafique">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#d6b9eb]">
            Explore
          </h2>
          <ul className="mt-4 grid gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-11 items-center text-[#e3d6ec] underline-offset-4 hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Policies">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-[#d6b9eb]">
            Good to know
          </h2>
          <ul className="mt-4 grid gap-1">
            {policies.map((label) => (
              <li key={label}>
                <Link
                  href={`/${label.toLowerCase()}`}
                  className="inline-flex min-h-11 items-center text-sm text-[#e3d6ec] underline-offset-4 hover:underline"
                >
                  {label === "Terms" ? "Terms of service" : `${label} policy`}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-white/15 px-5 py-5 sm:px-8">
        <p className="mx-auto max-w-screen-xl text-sm text-[#e3d6ec]">
          © {new Date().getFullYear()} Moonafique LLC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
