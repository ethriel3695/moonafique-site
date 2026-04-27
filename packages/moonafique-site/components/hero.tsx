import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Stars } from 'lucide-react';
import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,_hsl(var(--accent)/0.5),_transparent_30%),linear-gradient(135deg,_hsl(var(--background)),_hsl(var(--surface))_52%,_hsl(var(--secondary)))] px-6 py-14 shadow-lift sm:px-10 lg:px-14 lg:py-20">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_hsl(var(--primary)/0.16),_transparent_55%)] lg:block" />
      <div className="absolute -left-16 top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-10 h-52 w-52 rounded-full bg-accent/40 blur-3xl" />
      <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-7">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="featured" className="px-4 py-1.5 text-[0.65rem]">
              Boutique 3D studio
            </Badge>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              Designed for collectors, classrooms, and curious desks
            </span>
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl leading-[0.95] sm:text-6xl lg:text-7xl">
              Whimsical creatures with a collector&rsquo;s finish.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Moonafique turns playful ideas into tactile 3D-printed keepsakes,
              from articulated dragons to tiny fossil curiosities made to spark
              delight the moment they land on a shelf.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="group">
              <Link href="/?search=dragon">
                Explore Dragons
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/?search=">Browse All Creations</Link>
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Finish
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                Display-worthy color and texture
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Rhythm
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                Weekly drops and market-ready favorites
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Vibe
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                Cute, curious, and just a little celestial
              </p>
            </div>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -top-6 right-8 flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-4 py-2 shadow-soft">
            <Stars className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Small-batch originals
            </span>
          </div>
          <div className="rounded-[2rem] border border-border/70 bg-background/85 p-6 shadow-lift backdrop-blur">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,_hsl(var(--primary)/0.18),_hsl(var(--background))_70%)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Best sellers
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">
                  Articulated dragons
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Flexible silhouettes with collector-friendly detail and a
                  playful shelf presence.
                </p>
              </div>
              <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,_hsl(var(--accent)/0.4),_hsl(var(--background))_72%)] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70">
                  Classroom favorites
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-foreground">
                  Tiny fossils and creatures
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  A growing lineup of tactile miniatures sized for desks,
                  demos, and curiosity cabinets.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-[1.75rem] border border-border/70 bg-surface p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Why people stop at the booth
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-3xl font-semibold text-foreground">3D</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Layered prints with tactile character
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">100%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Designed to feel giftable on first glance
                  </p>
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">∞</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Enough whimsy for new drops and custom requests
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
