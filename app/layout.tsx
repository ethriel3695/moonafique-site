// import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
// import { withAuth, getSignInUrl } from '@/app/actions/user';
import { cn } from '@/lib/utils';
import { SiteHeader } from '@/components/siteHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Inter } from 'next/font/google';
import { CartProvider } from '@/lib/cart-context';
import { Toaster } from '@/components/ui/toaster';
import { Footer } from '@/components/Footer';
const inter = Inter({ subsets: ['latin'] });
import './globals.css';

export const metadata = {
  title: 'Moonafique',
  description:
    'Welcome to Moonafique! High quality 3D prints. We are a small team of 3D printing enthusiasts who love to create and share our work with the world.',
};

// async function getData() {
//   const user = await withAuth();
//   return { user: user.user };
// }

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  // const { user } = await getData();
  // const signInUrl = await getSignInUrl();

  return (
    <html lang="en">
      <head>
        {(process.env.NODE_ENV === 'development' ||
          process.env.VERCEL_ENV === 'preview') && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            data-recording-token="Pj5FKQCNkHQTAcwznr4kOkI3blWjMPZdHEP27xfj"
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        )}
      </head>
      <body
        className={cn('flex min-h-svh flex-col antialiased', inter.className)}
      >
        {/* <AuthKitProvider> */}
        <CartProvider>
          <TooltipProvider delayDuration={0}>
            {/* <SiteHeader signInUrl={signInUrl} user={user} /> */}
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <Footer />
          </TooltipProvider>
        </CartProvider>
        {/* </AuthKitProvider> */}
        <Toaster />
      </body>
    </html>
  );
}
