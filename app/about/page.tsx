import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-16">
      <div className="max-w-3xl mx-auto space-y-16">
        <section>
          <h1 className="text-4xl font-bold tracking-tight mb-6">Our Story</h1>
          <div className="prose prose-lg text-muted-foreground">
            <p>
              Moonafique was born from a passion for 3D printing and a love for
              creating unique, high-quality pieces that bring joy to us and the
              people around us. What started as a small workshop in our home has
              grown into a thriving business dedicated to pushing the boundaries
              of what&apos;s possible with 3D printing technology.
            </p>
            <p>
              Our journey began when our founder, a creative and artistic
              person, noticed a gap in the market for premium-quality, detailed
              3D printed collectibles. Combining technical expertise with
              artistic vision, we set out to create pieces that not only look
              stunning but also stand the test of time.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            Our Mission
          </h2>
          <div className="prose prose-lg text-muted-foreground">
            <p>
              At Moonafique, our mission is simple: to create exceptional 3D
              printed pieces that inspire and delight. We believe in the power
              of technology to bring artistic visions to life, and we&apos;re
              committed to using that power responsibly and sustainably.
            </p>
            <p>
              Every piece we create is a testament to our dedication to quality,
              innovation, and customer satisfaction. We&apos;re not just selling
              products; we&apos;re creating experiences and building a community
              of passionate collectors and enthusiasts.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold tracking-tight mb-6">Our Values</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Quality First</h3>
              <p className="text-muted-foreground">
                We never compromise on quality. Every piece undergoes rigorous
                quality control to ensure it meets our high standards before
                reaching our customers.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Innovation</h3>
              <p className="text-muted-foreground">
                We&apos;re constantly exploring new techniques and materials to
                push the boundaries of what&apos;s possible in 3D printing.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Sustainability</h3>
              <p className="text-muted-foreground">
                We&apos;re committed to minimizing our environmental impact by
                using eco-friendly materials and optimizing our production
                processes.
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Customer Focus</h3>
              <p className="text-muted-foreground">
                Our customers are at the heart of everything we do. We strive to
                provide exceptional service and create pieces that exceed
                expectations.
              </p>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            Join Our Journey
          </h2>
          <p className="text-muted-foreground mb-8">
            We&apos;re always looking for new ways to innovate and create.
            Whether you&apos;re a collector, enthusiast, or just curious about
            3D printing, we&apos;d love to have you join our community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link href="/contact">Get in Touch</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Browse Our Collection</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
