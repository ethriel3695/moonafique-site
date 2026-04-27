import Link from 'next/link';

const categories = [
  { name: 'Dragons', search: 'dragon' },
  { name: 'Sea Creatures', search: 'narwhal' },
  { name: 'Wild Animals', search: 'racoon' },
  { name: 'Dinosaurs', search: 'dino' },
  { name: 'Farm Animals', search: 'cow' },
  { name: 'All Products', search: '' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookie Policy', href: '/cookies' },
  { label: 'Refund Policy', href: '/refund' },
  { label: 'Shipping Policy', href: '/shipping' },
  { label: 'Quality Policy', href: '/quality' },
];

export const Footer = ({}) => {
  return (
    <footer className="border-t border-border/60 bg-[linear-gradient(180deg,_hsl(var(--surface))_0%,_hsl(var(--foreground))_100%)] text-primary-foreground">
      <div className="mx-auto grid max-w-screen-xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] lg:px-8">
        <div className="space-y-5">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 shadow-soft">
              <h2 className="font-display text-3xl text-white">Moonafique</h2>
            </div>
          </Link>
          <p className="max-w-md text-base leading-7 text-primary-foreground/78">
            Small-batch 3D-printed creatures, fossils, and curious desk pieces
            made to feel playful, polished, and easy to gift.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://www.tiktok.com/@moonafique"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-white/14"
            >
              TikTok
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61567210106767"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-white/14"
            >
              Facebook
            </a>
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
              Shop by mood
            </h3>
            <div className="mt-4 grid gap-2">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={`/?search=${encodeURIComponent(category.search)}`}
                  className="text-base text-primary-foreground/82 transition-colors hover:text-white"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-primary-foreground/70">
              Policies and contact
            </h3>
            <div className="mt-4 grid gap-2">
              <Link
                href="/contact"
                className="text-base text-primary-foreground/82 transition-colors hover:text-white"
              >
                Contact Moonafique
              </Link>
              <Link
                href="/about"
                className="text-base text-primary-foreground/82 transition-colors hover:text-white"
              >
                About the studio
              </Link>
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-base text-primary-foreground/82 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-screen-xl flex-col gap-3 px-4 py-5 text-sm text-primary-foreground/70 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>
            © {new Date().getFullYear()} Moonafique LLC. All rights reserved.
          </p>
          <p>Made for shelves, gift tables, and curious little moments.</p>
        </div>
      </div>
    </footer>
  );
};
