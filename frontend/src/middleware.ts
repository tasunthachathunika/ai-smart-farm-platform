import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware
 * Note: Middleware only checks that the httpOnly accessToken cookie EXISTS.
 * It CANNOT read or decrypt the role inside httpOnly JWTs on the client edge.
 * Fine-grained RBAC and verification checks are enforced by client-side <RoleGuard>
 * and the backend database on every request.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets and internal next paths are exempt
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Public routes exempt from session cookie requirement
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname.startsWith('/dev');

  const hasAccessToken = request.cookies.has('accessToken');

  // If visiting protected app routes without an active session cookie, redirect to login
  if (!isPublicRoute && !hasAccessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
