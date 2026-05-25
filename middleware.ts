import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Minimal cookie bridge for @supabase/ssr in middleware
  const cookieStore = {
    getAll() {
      try {
        // NextRequest.cookies.getAll() returns an array of cookies
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
      } catch {
        return []
      }
    },
    setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Write cookies to the outgoing response so browser receives refreshed auth
          // `options` is passed through as-is (secure, httpOnly, sameSite, path, maxAge)
          // NextResponse.cookies.set accepts a similar shape
          // @ts-ignore - options type shape varies across environments
          res.cookies.set(name, value, options)
        })
      } catch {
        // swallow cookie write failures in middleware
      }
    },
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore as any },
  )

  // Refresh session / user on every request so server components receive up-to-date cookies
  try {
    await supabase.auth.getUser()
  } catch (e) {
    // ignore — don't block requests if refresh fails
  }

  // Protect admin routes: redirect non-admin users to login
  try {
    const { pathname } = req.nextUrl
    if (pathname.startsWith('/admin')) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || user.app_metadata?.role !== 'admin') {
        const loginUrl = new URL('/login', req.url)
        return NextResponse.redirect(loginUrl)
      }
    }
  } catch (e) {
    // allow request to continue on errors
  }

  return res
}

export const config = {
  // Avoid matching Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
