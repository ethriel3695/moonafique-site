'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  HandHeart,
  MessageCircleHeart,
  PackageCheck,
  ShieldCheck,
  Star,
} from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Anonymous',
    role: 'Dino and Fossil Enthusiast',
    content:
      'I had to have the extra large Pteranodon. It kept calling to me from my booth!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Anonymous',
    role: 'Teacher',
    content: 'I am excited for the micro prints. My students will love them!',
    rating: 5,
  },
];

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentTestimonial = testimonials[currentIndex];

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--surface))_44%,_hsl(var(--background)))] pb-16 pt-10 sm:pb-20 sm:pt-14">
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.24em] text-primary">
            Why people trust Moonafique
          </p>
          <h2 className="mt-4 text-4xl sm:text-5xl">
            Every print leaves our hands before it reaches yours.
          </h2>
          <p className="mt-4 text-lg font-medium leading-8 text-muted-foreground">
            This is not a warehouse catalog. It is a family-run print table:
            small batches, careful checks, honest expectations, and pieces we
            are proud to hand to someone in person.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:items-stretch">
          <div className="grid gap-4">
            <TrustPoint
              icon={<HandHeart className="size-5" />}
              iconClassName="bg-primary/12 text-primary"
              title="Made by the people behind the shop"
            >
              We print, inspect, pack, and answer questions ourselves, so the
              care does not disappear after checkout.
            </TrustPoint>
            <TrustPoint
              icon={<ShieldCheck className="size-5" />}
              iconClassName="bg-warning/20 text-warning-foreground"
              title="Clear about what these pieces are"
            >
              Moonafique prints are collectible display pieces made for wonder,
              gifting, classrooms, and careful hands.
            </TrustPoint>
            <TrustPoint
              icon={<PackageCheck className="size-5" />}
              iconClassName="bg-success/15 text-success"
              title="Packed like we care what happens next"
            >
              The goal is simple: open the box, smile immediately, and feel like
              the piece was meant for you.
            </TrustPoint>
          </div>

          <div className="rounded-lg border border-border/80 bg-background p-6 shadow-lift sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 pb-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-primary">
                  Customer words
                </p>
                <div className="mt-3 flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`size-5 ${
                        i < currentTestimonial.rating
                          ? 'fill-warning text-warning'
                          : 'text-border'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <span className="flex size-12 items-center justify-center rounded-full bg-accent/35 text-primary">
                <MessageCircleHeart className="size-6" />
              </span>
            </div>

            <figure className="mt-7">
              <blockquote className="text-2xl font-semibold leading-10 text-foreground">
                &ldquo;{currentTestimonial.content}&rdquo;
              </blockquote>
              <figcaption className="mt-8 flex flex-col gap-5 border-t border-border/70 pt-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="font-bold text-foreground">
                    {currentTestimonial.name}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {currentTestimonial.role}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <p className="text-sm font-medium text-muted-foreground">
                    {currentIndex + 1} of {testimonials.length}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={prevTestimonial}
                      className="rounded-full bg-background"
                      aria-label="Previous testimonial"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={nextTestimonial}
                      className="rounded-full bg-background"
                      aria-label="Next testimonial"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustPoint({
  children,
  icon,
  iconClassName,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  iconClassName: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/85 p-5 shadow-soft">
      <div className="flex gap-4">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
        >
          {icon}
        </span>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-2 leading-7 text-muted-foreground">{children}</p>
        </div>
      </div>
    </div>
  );
}
