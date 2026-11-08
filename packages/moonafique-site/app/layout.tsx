// import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
// import { withAuth } from '@workos-inc/authkit-nextjs';
import { cn } from "@/lib/utils";
import { SiteHeader } from "@/components/siteHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lora, manrope } from "@/lib/site-fonts";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "@/components/ui/toaster";
import { Footer } from "@/components/Footer";
import { brandDescription } from "@/lib/site-content";
import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://www.moonafique.com"),
  title: "Moonafique | Original art & collectible characters",
  description: brandDescription,
  openGraph: {
    title: "Moonafique",
    description: brandDescription,
    type: "website",
    images: [{ url: "/moonafique-logo.png", alt: "Moonafique" }],
  },
  twitter: {
    card: "summary",
    title: "Moonafique",
    description: brandDescription,
    images: ["/moonafique-logo.png"],
  },
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const auth = await withAuth();
  // const initialAuth = {
  //   user: auth.user,
  //   sessionId: auth.sessionId,
  //   organizationId: auth.organizationId,
  //   role: auth.role,
  //   roles: auth.roles,
  //   permissions: auth.permissions,
  //   entitlements: auth.entitlements,
  //   featureFlags: auth.featureFlags,
  //   impersonator: auth.impersonator,
  // };

  return (
    <html lang="en">
      <body
        className={cn(
          "flex min-h-svh flex-col antialiased",
          manrope.className,
          manrope.variable,
          lora.variable,
        )}
      >
        {/* <AuthKitProvider initialAuth={initialAuth}> */}
        <CartProvider>
          <TooltipProvider delayDuration={0}>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-primary focus:px-5 focus:py-3 focus:font-bold focus:text-primary-foreground">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main-content" tabIndex={-1} className="flex-1 scroll-mt-28">{children}</main>
            <Footer />
          </TooltipProvider>
        </CartProvider>
        {/* </AuthKitProvider> */}
        <Toaster />
      </body>
    </html>
  );
}
