import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // Skip auth checks if Supabase is not configured yet
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
        return response
    }

    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Refresh session if expired - required for Server Components
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (user) {
        // console.log("Middleware: User identified", user.id);
    } else if (authError && !pathname.startsWith('/api')) {
        // console.log("Middleware: Auth error", authError.message);
    }

    // Protected Routes Logic
    const isDashboardRoute = pathname.startsWith('/dashboard') ||
        pathname.startsWith('/historia-clinica') ||
        pathname.startsWith('/agenda') ||
        pathname.startsWith('/pacientes') ||
        pathname.startsWith('/chat') ||
        pathname.startsWith('/leads') ||
        pathname.startsWith('/reportes') ||
        pathname.startsWith('/config') ||
        pathname.startsWith('/settings');

    const isAuthRoute = pathname.startsWith('/login') ||
        pathname.startsWith('/register');

    const isOnboardingRoute = pathname.startsWith('/onboarding');

    if (isDashboardRoute && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAuthRoute && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Check onboarding status (skip for invited users and auth callbacks)
    const isCallbackRoute = pathname.startsWith('/auth/callback');
    if (user && !isAuthRoute && !isOnboardingRoute && !isCallbackRoute && !pathname.startsWith('/api') && !pathname.startsWith('/_next') && !pathname.includes('.')) {
        // Invited users (via metadata) skip onboarding automatically
        const isInvitedUser = user.user_metadata?.invited === true;
        if (isInvitedUser) {
            // Invited user, let them through to dashboard
            return response;
        }

        const { data: profile } = await supabase
            .from('professional')
            .select('is_onboarded')
            .eq('id', user.id)
            .maybeSingle();

        // If no profile exists OR it exists but is_onboarded is false, redirect to onboarding
        if (!profile || profile.is_onboarded === false) {
            return NextResponse.redirect(new URL('/onboarding', request.url))
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
