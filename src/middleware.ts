import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Edge middleware.
 *
 * Three jobs, in order:
 *
 *  1. Refresh the Supabase session cookie so a Server Component always sees a
 *     valid token.
 *
 *  2. Gate protected routes. IMPORTANT: this is a UX gate, not the security
 *     boundary. It only checks that *a* session exists. The authoritative role
 *     check happens server-side in `guardAdmin()` / `requireAdmin()` against the
 *     `user_roles` table, because a JWT claim must never be trusted for
 *     authorisation.
 *
 *  3. Mint the anonymous visitor cookie used for privacy-conscious analytics.
 *     Set here so it exists for anonymous visitors too — a Server Component
 *     cannot set a cookie during render.
 */

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/create-gift', '/settings'];
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

const SESSION_COOKIE = 'hd_vid';
const SESSION_TTL_SECONDS = 60 * 30;

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // The publishable keys are read from the request environment. If Supabase is
  // not configured we still want the app to render (it degrades to read-only
  // empty states), so we skip auth entirely rather than crashing.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    // Refresh the token. `getUser()` (not `getSession()`) is what actually
    // validates the JWT against the auth server.
    let hasSession = false;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      hasSession = Boolean(user);
    } catch {
      // Network hiccup against the auth server: treat as unauthenticated rather
      // than 500-ing the whole site.
      hasSession = false;
    }

    if (isProtected(pathname) && !hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return NextResponse.redirect(url);
    }

    // Signed-in users have no reason to see the auth screens.
    if (isAuthRoute(pathname) && hasSession) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  } else if (isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Anonymous visitor id for analytics. httpOnly, SameSite=Lax, no PII.
  if (!request.cookies.get(SESSION_COOKIE)) {
    response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on page navigations only. Everything below is excluded, and each
     * exclusion is load-bearing:
     *
     *  - `api` — route handlers do their own guarding, and the session refresh
     *    would add a round-trip to every AI call.
     *  - `_next/*` — **the dev server serves its RSC payload, HMR updates and
     *    chunk files under `/_next/`**. Letting the middleware run there means
     *    `supabase.auth.getUser()` (a real network call) is awaited before every
     *    bundle is served. That serialises and stalls module loading, which is
     *    what surfaces as "Could not find the module ... in the React Client
     *    Manifest", "__webpack_modules__[moduleId] is not a function", "Cannot
     *    find module './NNNN.js'" and 500s on dynamic routes. Never run
     *    middleware on `_next`.
     *  - metadata + static asset extensions — no session work needed.
     */
    '/((?!api|_next/static|_next/image|_next/webpack-hmr|_next/|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|ttf|otf|eot|map|txt|xml|json)$).*)',
  ],
};