import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// MUST be a named export called "middleware"
export default function proxy(req: NextRequest) {
    const token = req.cookies.get('auth_token')?.value;
    const { pathname } = req.nextUrl;

    console.log('Middleware triggered for path:', pathname, '| Token found:', !!token);

    const isAuthPage = pathname === '/auth';
    const DASHBOARD = '/';

    // SCENARIO A: No token & Not on auth page -> Kick to /auth
    if (!token && !isAuthPage) {
        return NextResponse.redirect(new URL('/auth', req.url));
    }

    // SCENARIO B: Has token & Trying to view login page -> Kick to Dashboard
    if (token && isAuthPage) {
        return NextResponse.redirect(new URL(DASHBOARD, req.url));
    }

    // SCENARIO C: Let everything else pass (including requests to '/')
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};