import { authkitMiddleware } from '@workos-inc/authkit-nextjs';

export default authkitMiddleware({
  debug: true,
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ['/'],
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
    '/about',
    '/contact',
    '/account',
    '/cart',
    '/product/:path*',
    '/contact',
    '/about',
    '/faq',
    '/terms',
    '/privacy',
    '/refund',
    '/shipping',
    '/cookies',
  ],
};
