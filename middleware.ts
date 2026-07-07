import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES = ['/', '/suspended', '/superadmin']

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

  if (
    PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const segments = pathname.split('/').filter(Boolean)
  const slug = segments[0]

  if (!slug) {
    return NextResponse.redirect(new URL('/', req.url))
  }

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

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { data } = await supabase
    .rpc('get_hospital_by_slug', { p_slug: slug })
    .single()

  const hospital = data as HospitalRow | null

  if (!hospital) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const now = new Date()
  const isTrialExpired =
    hospital.status === 'trial' &&
    hospital.trial_ends_at &&
    new Date(hospital.trial_ends_at) < now

  if (hospital.status === 'inactive' || hospital.status === 'suspended' || isTrialExpired) {
    return NextResponse.redirect(new URL(`/suspended?hospital=${slug}`, req.url))
  }

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
