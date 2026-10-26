import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/grim-club/:path*', destination: '/grimmunity/:path*', permanent: true },
      { source: '/account/grim-club/:path*', destination: '/account/grimmunity/:path*', permanent: true },
      { source: '/admin/grim-club/:path*', destination: '/admin/grimmunity/:path*', permanent: true },
    ];
  },
  async rewrites() {
    // Keep existing Stripe webhooks and API clients working without redirecting POST bodies.
    return [{ source: '/api/grim-club/:path*', destination: '/api/grimmunity/:path*' }];
  },
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Configure output to be standalone for better performance
  output: 'standalone',
  // Enable experimental features that are stable
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
