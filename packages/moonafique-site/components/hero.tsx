import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductListResponse } from '@/lib/schema';
import { ArrowRight, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const fallbackHeroImages = ['/placeholder-image.png'];

function getHeroImages(products?: ProductListResponse) {
  const productImages =
    products?.data.flatMap((product) => product.images ?? []) ?? [];
  const candidates =
    productImages.length > 0 ? productImages : fallbackHeroImages;
  const images: string[] = [];

  for (const image of candidates) {
    if (!images.includes(image)) {
      images.push(image);
    }

    if (images.length === 6) {
      return images;
    }
  }

  while (images.length < 6) {
    images.push(candidates[images.length % candidates.length]);
  }

  return images;
}

export function Hero({ products }: { products?: ProductListResponse }) {
  const heroImages = getHeroImages(products);

  return (
    <section className="relative isolate min-h-[620px] overflow-hidden bg-background text-foreground shadow-lift sm:min-h-[680px] lg:min-h-[700px]">
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-1 sm:grid-cols-3 sm:grid-rows-2 lg:grid-cols-6 lg:grid-rows-1">
        {heroImages.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className="relative min-h-36 overflow-hidden bg-muted"
          >
            <Image
              src={image}
              alt=""
              fill
              className="scale-[1.02] object-cover contrast-[1.05] saturate-[1.18]"
              priority={index < 2}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 17vw"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[hsl(var(--background)/0.82)] sm:hidden" />
      <div className="absolute inset-0 hidden bg-[linear-gradient(90deg,_hsl(var(--background)/0.98)_0%,_hsl(var(--background)/0.88)_42%,_hsl(var(--background)/0.36)_72%,_transparent_100%)] sm:block" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,_hsl(var(--background)/0.86)_0%,_transparent_48%,_hsl(var(--background)/0.18)_100%)]" />

      <div className="relative mx-auto flex min-h-[620px] max-w-screen-xl flex-col justify-between px-4 py-10 sm:min-h-[680px] sm:px-6 sm:py-14 lg:min-h-[700px] lg:px-8">
        <div className="max-w-4xl pt-8 sm:pt-12 lg:pt-16">
          <Badge
            variant="featured"
            className="shadow-[0_12px_30px_rgb(0_0_0_/_0.12)]"
          >
            Family run 3D print shop
          </Badge>
          <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[0.94] text-foreground sm:text-7xl lg:text-8xl">
            Moonafique 3D prints, made with ridiculous heart.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-foreground/78 sm:text-xl">
            We still stop to watch the printer build each creature layer by
            layer. Every dragon, fossil, and tiny desk companion is printed,
            checked, packed, and fussed over by the same two people who dreamed
            it up.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/#shop">
                Shop the latest
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-background/75 backdrop-blur"
            >
              <Link href="/about">Meet the makers</Link>
            </Button>
          </div>
        </div>

        <div className="mt-12 grid gap-3 pb-2 sm:grid-cols-3">
          <div className="border-t border-foreground/25 pt-4">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-foreground">
              <Heart className="size-4 fill-primary text-primary" />
              Made by us
            </p>
            <p className="mt-2 max-w-xs text-base font-semibold leading-6 text-foreground/70">
              Printed, checked, and packed by the two of us.
            </p>
          </div>
          <div className="border-t border-foreground/25 pt-4">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-foreground">
              <Sparkles className="size-4 text-primary" />
              Small batches
            </p>
            <p className="mt-2 max-w-xs text-base font-semibold leading-6 text-foreground/70">
              New colors and creatures when inspiration hits.
            </p>
          </div>
          <div className="border-t border-foreground/25 pt-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">
              Built for delight
            </p>
            <p className="mt-2 max-w-xs text-base font-semibold leading-6 text-foreground/70">
              The kind of prints people pick up, grin at, and show someone
              else.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
