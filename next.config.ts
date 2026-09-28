import path from 'node:path';
import type { NextConfig } from 'next';

// Pin the tracing/build root to this project.
//
// Without this, Next.js walks up the directory tree looking for lockfiles and
// can pick a *parent* folder (e.g. `C:\Users\<user>\package-lock.json`) as the
// workspace root. When that happens the app is compiled with a root that does
// not contain the app's own `node_modules`, which produces the classic dev-time
// failures: "Could not find the module ... in the React Client Manifest",
// "__webpack_modules__[moduleId] is not a function", "Cannot find module
// './NNNN.js'" and 500s on dynamic routes.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Explicitly declare the monorepo/workspace root for file tracing + bundling.
  outputFileTracingRoot: projectRoot,
  // Keep the dev overlay + HMR artefacts inside this project only.
  experimental: {
    // Supabase server clients and the OpenRouter service must not be bundled twice.
    optimizePackageImports: ['lucide-react', 'recharts', 'motion'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;