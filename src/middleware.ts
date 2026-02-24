import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export default async function proxy(request: NextRequest) {
    try {
        // 1. Refresh Session (This sets response cookies)
        const { response, user } = await updateSession(request)

        const path = request.nextUrl.pathname

        // 2. Define Public Routes
        // /auth includes callback, confirm, etc.
        const isPublicRoute =
            path.startsWith('/login') ||
            path.startsWith('/signup') ||
            path.startsWith('/auth');

        // 3. User is NOT Logged In
        if (!user) {
            // Allow public routes
            if (isPublicRoute) {
                return response
            }
            // Redirect unrelated paths to login
            // Exclude static files (handled by matcher, but good to be safe)
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            // Preserve original destination for redirectback (optional, not implemented here for simplicity)
            return NextResponse.redirect(url)
        }

        // 4. User IS Logged In
        if (user) {
            const role = user.user_metadata?.role || '';

            // A. Redirect Logged-In Users away from Login/Signup
            if (path.startsWith('/login') || path.startsWith('/signup')) {
                const url = request.nextUrl.clone()
                // Default Redirect based on Role
                if (role === 'super_admin') url.pathname = '/superadmin'
                else if (role === 'driver') url.pathname = '/driver'
                else if (role === 'recovery' || role === 'recovery_agent') url.pathname = '/recovery'
                else if (role === 'admin' || role === 'shop_manager') url.pathname = '/'
                else url.pathname = '/login'

                if (url.pathname !== '/login') {
                    return NextResponse.redirect(url)
                }
            }

            // B. Strict Role Enforcement

            // SUPER ADMIN
            if (role === 'super_admin') {
                // STRICT: Block /admin
                if (path.startsWith('/admin')) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/superadmin'
                    return NextResponse.redirect(url)
                }
                // Redirect Root to Super Admin
                if (path === '/') {
                    const url = request.nextUrl.clone()
                    url.pathname = '/superadmin'
                    return NextResponse.redirect(url)
                }
            }

            // DRIVER
            else if (role === 'driver') {
                // Must NOT access /admin or /superadmin or / (Root Dashboard)
                if (path.startsWith('/admin') || path.startsWith('/superadmin') || path.startsWith('/super-admin') || path === '/') {
                    const url = request.nextUrl.clone()
                    url.pathname = '/driver'
                    return NextResponse.redirect(url)
                }
            }

            // RECOVERY AGENT
            else if (role === 'recovery' || role === 'recovery_agent') {
                // Must NOT access /admin or /superadmin or /driver
                if (path.startsWith('/admin') || path.startsWith('/superadmin') || path.startsWith('/super-admin') || path.startsWith('/driver') || path === '/') {
                    const url = request.nextUrl.clone()
                    url.pathname = '/recovery'
                    return NextResponse.redirect(url)
                }
            }

            // ADMIN / SHOP MANAGER
            else if (role === 'admin' || role === 'shop_manager' || role === 'cashier') {
                // Block /superadmin
                if (path.startsWith('/superadmin') || path.startsWith('/super-admin')) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/'
                    return NextResponse.redirect(url)
                }
            }

            // UNAUTHORIZED / UNKNOWN ROLE
            else {
                // Prevents role fallthrough/data leaks.
                console.error(`Middleware Blocked Access for Unknown Role: '${role}' on path: ${path}`);
                if (!path.startsWith('/login')) {
                    const url = request.nextUrl.clone()
                    url.pathname = '/login'
                    url.searchParams.set('error', 'InvalidRole')
                    return NextResponse.redirect(url)
                }
            }
        }

        return response
    } catch (e) {
        // Prevent sync issues from crashing the site
        console.error("Middleware Error:", e);
        return NextResponse.next({
            request: {
                headers: request.headers,
            },
        });
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
