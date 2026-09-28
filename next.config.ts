import path from 'node:path';
import type { NextConfig } from 'next';

/*
 * Netlify.
 *
 * `NETLIFY` is set by the platform on every build and deploy, so this branch is
 * inert locally. The adapter itself is @netlify/plugin-nextjs, declared in
 * netlify.toml — it is what rewrites incoming requests to the Next server, and
 * without it Netlify serves `.next/static` and every page route 404s.
 *
 * See the note on `output` below for why nothing else is needed here.
 */
const isNetlify = Boolean(process.env.NETLIFY);

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

  // Set by the platform, not a build-output mode.
  //
  // `output: 'standalone'` is deliberately NOT used. On Netlify the
  // @netlify/plugin-nextjs adapter builds its own serverless functions from the
  // normal `.next` output; standalone additionally emits a self-contained node
  // server that Netlify never runs, which is dead weight in the bundle and the
  // usual source of "cannot find module" errors at runtime.
  ...(isNetlify ? { output: 'standalone' as const } : {}),

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