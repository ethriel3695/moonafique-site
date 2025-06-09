import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  debug: true,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: [
      '/',
      '/product/:path*',
      '/api/checkout',
      '/api/subscribe',
      '/contact',
      '/about',
      '/faq',
      '/terms',
      '/privacy',
      '/refund',
      '/shipping',
      '/cookies',
      '/cart',
      '/quality',
    ],
  },
});

// Match against pages that require auth
// Leave this out if you want auth on every resource (including images, css etc.)
export const config = {
  matcher: [
    '/',
    '/settings',
    '/order-history',
    '/admin',
    '/account',
    '/cart',
    '/product/:path*',
    '/api/checkout',
    '/api/subscribe',
    '/contact',
    '/about',
    '/faq',
    '/terms',
    '/privacy',
    '/cookies',
    '/refund',
    '/shipping',
    '/quality',
  ],
};
