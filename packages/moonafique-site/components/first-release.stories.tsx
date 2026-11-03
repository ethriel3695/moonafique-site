import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Homepage } from "@/components/homepage";
import { SiteHeader } from "@/components/siteHeader";
import { Footer } from "@/components/Footer";
import { ProductListThumbnail } from "@/components/product-list-thumbnail";
import { EmailSignupForm } from "@/components/email-signup-form";
import { CartProvider } from "@/lib/cart-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import type { ProductWithPrice } from "@/lib/schema";
const products: ProductWithPrice[] = [
  {
    id: "story-archie",
    name: "Archie · display sample",
    images: ["/showcase/archie-dressed-up.jpg"],
    description: "Storybook sample only.",
    price: { id: "price_story_archie", amount: 24, display_amount: "$24.00" },
    metadata: { stock: 6, status: "available" },
  },
  {
    id: "story-butterfly",
    name: "Butterfly · display sample",
    images: ["/showcase/butterfly-battle-bot-color.jpg"],
    description: "Storybook sample only.",
    price: {
      id: "price_story_butterfly",
      amount: 30,
      display_amount: "$30.00",
    },
    metadata: { stock: 0, status: "madeToOrder", madeToOrder: true },
  },
  {
    id: "story-no-photo",
    name: "Sample without a photo",
    images: [],
    price: { id: "price_story_no_photo", amount: 15, display_amount: "$15.00" },
    metadata: { stock: 4, status: "available" },
  },
  {
    id: "story-soon",
    name: "Upcoming piece · display sample",
    images: ["/showcase/archie-without-hat.jpg"],
    price: { id: "price_story_soon", amount: 18, display_amount: "$18.00" },
    metadata: { status: "comingSoon" },
  },
];
function FirstRelease() {
  return (
    <CartProvider storageKey="storybook-first-release">
      <TooltipProvider>
        <SiteHeader />
        <main>
          <Homepage
            catalog={
              <div>
                <p className="mb-5 rounded-xl border border-border bg-surface p-4 text-sm">
                  Storybook catalog examples. Photos illustrate layout; sample
                  names, prices, and availability are not live offers.
                </p>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {products.map((product) => (
                    <ProductListThumbnail key={product.id} product={product} />
                  ))}
                </div>
              </div>
            }
            newsletter={
              <EmailSignupForm
                subscribe={async () => {
                  /* Local demonstration; no email is sent. */
                }}
              />
            }
          />
        </main>
        <Footer />
        <Toaster />
      </TooltipProvider>
    </CartProvider>
  );
}
const meta = {
  title: "First release/Homepage",
  component: FirstRelease,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile: {
          name: "Mobile · 390px",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
    docs: {
      description: {
        component:
          "Local brand review. Catalog items are labeled fixtures. Newsletter submissions are simulated; nothing is sent or published.",
      },
    },
  },
} satisfies Meta<typeof FirstRelease>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Desktop: Story = {};
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
};

export const SmallMobile: Story = {
  parameters: {
    viewport: {
      options: {
        narrow: {
          name: "Small mobile · 320px",
          styles: { width: "320px", height: "740px" },
          type: "mobile",
        },
      },
    },
  },
  globals: { viewport: { value: "narrow", isRotated: false } },
};
