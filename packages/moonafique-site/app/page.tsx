import { ProductList } from '@/components/product-list';
import { Testimonials } from '@/components/testimonials';
import { FAQ } from '@/components/faq';
import { getProducts } from '@/lib/products';
import { Hero } from '@/components/hero';
import { AlertTriangle } from 'lucide-react';
import { EmailSignupForm } from '@/components/email-signup-form';

export default async function Page() {
  const products = await getProducts({ limit: 8 });

  return (
    <div className="flex min-h-screen flex-col">
      <Hero products={products} />

      <section id="shop" className="scroll-mt-24 pb-8 pt-14 sm:pb-10 sm:pt-16">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
              Shop the latest
            </p>
            <h2 className="mt-4 text-4xl sm:text-5xl">
              Find the creature that makes you smile first.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Browse fresh prints, booth favorites, and the small surprises we
              could not resist making. If something catches your eye, that is
              usually the right place to start.
            </p>
          </div>
          <ProductList initialList={products} />
        </div>
      </section>

      <div className="bg-[linear-gradient(180deg,_transparent,_hsl(var(--accent)/0.18)_24%,_transparent_100%)]">
        <Testimonials />
      </div>

      <FAQ />

      <section className="py-8 sm:py-10">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="rounded-[2rem] border border-border/70 bg-surface/80 p-6 shadow-soft sm:p-8">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="rounded-full bg-warning/18 p-3">
                <AlertTriangle className="mt-0.5 size-6 flex-shrink-0 text-warning-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-primary">
                  A quick care note
                </p>
                <h3 className="mt-2 text-2xl font-semibold">
                  Built for wonder, happiest when handled with care.
                </h3>
                <p className="mb-4 mt-3 text-base leading-7 text-muted-foreground">
                  These pieces are made to be admired, posed, gifted, and
                  collected. They are not mass-market toys, so a little care
                  helps the magic last.
                </p>
                <ul className="list-disc space-y-2 pl-6 text-muted-foreground marker:text-primary">
                  <li>Not suitable for children under 3 years of age</li>
                  <li>
                    Great for curious kids when an adult is nearby to help
                  </li>
                  <li>Handle with care as pieces may be delicate</li>
                  <li>
                    Keep away from direct sunlight and extreme temperatures
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 pt-10 sm:pb-20">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,_hsl(var(--primary))_0%,_hsl(284_31%_45%)_100%)] px-6 py-10 text-primary-foreground shadow-lift sm:px-10 lg:px-14 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase tracking-[0.26em] text-primary-foreground/90">
                Join the print table
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl">
                Want to see what comes off the printer next?
              </h2>
              <p className="mb-8 mt-4 text-lg font-medium leading-8 text-primary-foreground/95">
                We send the fun stuff: new creatures, restocks, market dates,
                and the occasional behind-the-scenes peek at what we are
                testing in the shop.
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <EmailSignupForm />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-primary-foreground/85">
              No inbox clutter. Just new drops, favorite finds, and a little
              maker joy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
