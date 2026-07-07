import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Routes that don't need hospital context
const PUBLIC_ROUTES = ['/', '/suspended', '/superadmin']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip public routes and static files
  if (
    PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Extract hospital slug from path: /bghmc/dashboard → 'bghmc'
  const segments = pathname.split('/').filter(Boolean)
  const slug = segments[0]

  if (!slug) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Create Supabase client for middleware
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

  // Check user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check hospital exists and is active
  const { data: hospital } = await supabase
    .rpc('get_hospital_by_slug', { p_slug: slug })
    .single()

  if (!hospital) {
    // Hospital slug not found — redirect to login
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Check hospital status
  const now = new Date()
  const isTrialExpired =
    hospital.status === 'trial' &&
    hospital.trial_ends_at &&
    new Date(hospital.trial_ends_at) < now

  if (hospital.status === 'inactive' || hospital.status === 'suspended' || isTrialExpired) {
    return NextResponse.redirect(new URL(`/suspended?hospital=${slug}`, req.url))
  }

  // Pass hospital info to pages via headers
  const response = NextResponse.next()
  response.headers.set('x-hospital-id', hospital.id)
  response.headers.set('x-hospital-slug', hospital.slug)
  response.headers.set('x-hospital-name', hospital.name)
  response.headers.set('x-hospital-plan', hospital.plan_name || 'Starter')

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
