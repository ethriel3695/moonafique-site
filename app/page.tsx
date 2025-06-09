import { ProductList } from '@/components/product-list';
import { Testimonials } from '@/components/testimonials';
import { FAQ } from '@/components/faq';
import { getProducts } from '@/lib/products';
// import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { EmailSignupForm } from '@/components/email-signup-form';

export default async function Page() {
  const products = await getProducts();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted py-20">
        <div className="mx-auto max-w-screen-xl px-4 text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Welcome to Our Mystical World
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {`It's cute, it's chic, it's Moonafique!`}
          </p>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-screen-xl px-4">
          <h2 className="text-4xl font-bold tracking-tight mb-12 text-center">
            Our Products
          </h2>
          <ProductList initialList={products} />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-muted/50">
        <div className="mx-auto max-w-screen-xl px-4">
          <Testimonials />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-screen-xl px-4">
          <FAQ />
        </div>
      </section>

      {/* Disclaimer Section */}
      <section className="py-16 bg-muted/50">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="bg-card rounded-lg p-6 shadow-sm border border-border">
            <div className="flex items-start gap-4">
              <AlertTriangle className="size-6 text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Important Notice</h3>
                <p className="text-muted-foreground mb-4">
                  Our 3D printed items are collectibles and display pieces, not
                  toys. They are designed for collectors..
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
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

      {/* Email Signup Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="mx-auto max-w-screen-xl px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="mb-8 text-primary-foreground/90">
              Subscribe to our newsletter for the latest products, exclusive
              offers, and 3D printing tips.
            </p>
            <EmailSignupForm />
          </div>
        </div>
      </section>
    </div>
  );
}
