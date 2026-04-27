import { ProductList } from '@/components/product-list';
import { Testimonials } from '@/components/testimonials';
import { FAQ } from '@/components/faq';
import { getProducts } from '@/lib/products';
import { Hero } from '@/components/hero';
import { AlertTriangle } from 'lucide-react';
import { EmailSignupForm } from '@/components/email-signup-form';

export default async function Page() {
  const products = await getProducts();

  return (
    <div className="flex min-h-screen flex-col">
      <section className="px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10 lg:pt-10">
        <div className="mx-auto max-w-screen-xl">
          <Hero />
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary">
              Shop the collection
            </p>
            <h2 className="mt-4 text-4xl sm:text-5xl">
              Creatures, fossils, and small-batch favorites ready to browse.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Browse the newest Moonafique pieces with the updated boutique
              styling system applied across the storefront experience.
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
                  Collector notice
                </p>
                <h3 className="mt-2 text-2xl font-semibold">Made for display first, play with care.</h3>
                <p className="mb-4 mt-3 text-base leading-7 text-muted-foreground">
                  Our 3D printed items are collectibles and display pieces, not
                  toys. They are designed for collectors and careful little hands.
                </p>
                <ul className="list-disc space-y-2 pl-6 text-muted-foreground marker:text-primary">
                  <li>Not suitable for children under 3 years of age</li>
                  <li>
                    Some items can be used by children for learning and
                    development with adult supervision
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
          <div className="overflow-hidden rounded-[2rem] bg-[linear-gradient(140deg,_hsl(var(--primary))_0%,_hsl(12_68%_38%)_100%)] px-6 py-10 text-primary-foreground shadow-lift sm:px-10 lg:px-14 lg:py-14">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.26em] text-primary-foreground/75">
                Stay in the loop
              </p>
              <h2 className="mt-4 text-4xl sm:text-5xl">
                Get first notice when the next creatures arrive.
              </h2>
              <p className="mb-8 mt-4 text-lg leading-8 text-primary-foreground/85">
                Subscribe for new releases, market announcements, and the kind
                of tiny curiosities that tend to disappear quickly.
              </p>
            </div>
            <div className="mx-auto max-w-3xl">
              <EmailSignupForm />
            </div>
            <p className="mt-4 text-center text-sm text-primary-foreground/70">
              No spam. Just fresh drops, restocks, and the occasional favorite from the studio.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
