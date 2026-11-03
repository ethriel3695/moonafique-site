import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import AboutPage from "@/app/about/page";
import { SiteHeader } from "./siteHeader";
import { Footer } from "./Footer";
import { CommunitiesView } from "./grimmunity/communities";
import { OfferView } from "./grimmunity/views";
import { storyEdition, storyNow, storyProgram } from "./grimmunity/story-fixtures";
import { CartProvider } from "@/lib/cart-context";
import { TooltipProvider } from "./ui/tooltip";
import { membershipBilling } from "@/lib/grimmunity/billing-options";

function BrandPage({ page, enrollmentOpen = false }: {
  page: "memberships" | "grimm" | "aceo" | "about";
  enrollmentOpen?: boolean;
}) {
  return (
    <CartProvider storageKey="storybook-brand-pages">
      <TooltipProvider>
        <div
          onSubmitCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClickCapture={(event) => {
            const link = (event.target as HTMLElement).closest("a[href]");
            if (link && !link.getAttribute("href")?.startsWith("#"))
              event.preventDefault();
          }}
        >
          <p role="note" className="bg-amber-50 px-5 py-3 text-sm text-amber-950">
            Local brand review. Enrollment, edition dates, and capacities are
            examples. Forms and navigation do not contact live services.
          </p>
          <SiteHeader />
          <main>
            {page === "about" ? (
              <AboutPage />
            ) : page === "memberships" ? (
              <CommunitiesView />
            ) : (
              <OfferView
                fixture
                club={page}
                program={{
                  ...storyProgram,
                  id: "live",
                  enabled: enrollmentOpen,
                  approved_at: enrollmentOpen ? storyNow : null,
                  billing_policy: "notice_shipping_v1",
                  tax_mode: "exclusive",
                  cancellation_text:
                    "Cancel membership renewal in your account. Prepaid coverage remains in place; monthly postage is still due for deliveries during that coverage.",
                  tiers: storyProgram.tiers.map((tier) => ({
                    ...tier,
                    billing_options: ([1, 6, 12] as const).map((months) => {
                      const option = membershipBilling(tier.amount, months);
                      return {
                        months,
                        amount: option.amount,
                        discount: option.discount,
                        price_id: months === 1 ? tier.price_id : `price_story_${tier.id}_${months}`,
                      };
                    }),
                  })),
                }}
                edition={storyEdition}
                now={storyNow}
                interestEnabled
              />
            )}
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </CartProvider>
  );
}

const meta = {
  title: "First release/Brand pages",
  component: BrandPage,
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
  },
} satisfies Meta<typeof BrandPage>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Memberships: Story = { args: { page: "memberships" } };
export const Grimmunity: Story = { args: { page: "grimm" } };
export const ACEOs: Story = { name: "ACEOs", args: { page: "aceo" } };
export const About: Story = { args: { page: "about" } };
export const GrimmunityMobile: Story = {
  args: { page: "grimm" },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
export const ACEOsMobile: Story = {
  name: "ACEOs Mobile",
  args: { page: "aceo" },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
export const GrimmunityEnrollmentOpen: Story = {
  args: { page: "grimm", enrollmentOpen: true },
};
export const ACEOsEnrollmentOpen: Story = {
  name: "ACEOs Enrollment Open",
  args: { page: "aceo", enrollmentOpen: true },
};
export const AboutMobile: Story = {
  args: { page: "about" },
  globals: { viewport: { value: "mobile", isRotated: false } },
};
