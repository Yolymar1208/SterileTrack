import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

type HospitalRow = {
  id: string
  name: string
  slug: string
  status: string
  plan_name: string
  trial_ends_at: string | null
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow public routes
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/suspended') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for Supabase auth cookie
  const cookies = req.cookies.getAll()
  const hasSession = cookies.some(c =>
    c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
  )
  if (!hasSession) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Extract hospital slug from path
  const segments = pathname.split('/').filter(Boolean)
  const slug = segments[0]
  if (!slug) return NextResponse.next()

  // Check hospital status for trial expiry
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll() },
          setAll() {},
        },
      }
    )

    const { data } = await supabase
      .rpc('get_hospital_by_slug', { p_slug: slug })
      .single()

    const hospital = data as HospitalRow | null

    if (hospital) {
      const isTrialExpired =
        hospital.status === 'trial' &&
        hospital.trial_ends_at &&
        new Date(hospital.trial_ends_at) < new Date()

      if (hospital.status === 'inactive' || hospital.status === 'suspended' || isTrialExpired) {
        return NextResponse.redirect(new URL(`/suspended?hospital=${slug}`, req.url))
      }

      // Pass hospital info via headers
      const response = NextResponse.next()
      response.headers.set('x-hospital-status', hospital.status)
      response.headers.set('x-trial-ends', hospital.trial_ends_at || '')
      return response
    }
  } catch {
    // If RPC fails, allow through (client-side will handle)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
