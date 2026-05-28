import { Fraunces, Manrope } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata = {
  title: 'Activate Signup',
  description: 'Volunteer and donation signups for Activate productions.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-svh bg-background text-foreground antialiased',
          manrope.className,
          manrope.variable,
          fraunces.variable
        )}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}