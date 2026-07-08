'use client'
import OnboardingWizard from '@/components/OnboardingWizard'
import NotificationsPanel from '@/components/NotificationsPanel'
import { useTheme } from '@/components/ThemeProvider'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Package, Inbox, Send,
  Archive, ListChecks, History, Bell,
  Shield, LogOut, Menu, ChevronRight,
  Users, ClipboardCheck, Settings, X, Moon, Sun, SlidersHorizontal
} from 'lucide-react'

const SUPERADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams()
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const slug     = params?.hospital as string

  const { theme, toggle: toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const [accentColor, setAccentColor]       = useState('#00C9D4')
  const [logoUrl, setLogoUrl]               = useState<string | null>(null)
  const [user, setUser]                     = useState<{ name: string; role: string; initials: string; id: string; email: string } | null>(null)
  const [hospitalName, setHospitalName]     = useState('')
  const [alertCount, setAlertCount]         = useState(0)
  const [orPendingCount, setOrPendingCount] = useState(0)

  const NAV = [
    { section: 'Main', items: [
      { href: `/${slug}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
    ]},
    { section: 'CSSD Workflow', items: [
      { href: `/${slug}/dispensing`,      label: 'Dispensing',     icon: Send,           highlight: true },
      { href: `/${slug}/or-verification`, label: 'OR Verify',      icon: ClipboardCheck, highlight: true, badge: 'or' },
      { href: `/${slug}/receiving`,       label: 'Receiving',      icon: Inbox,          highlight: true },
    ]},
    { section: 'Management', items: [
      { href: `/${slug}/inventory`, label: 'Inventory',       icon: Package },
      { href: `/${slug}/sets`,      label: 'Instrument Sets', icon: ListChecks },
      { href: `/${slug}/storage`,   label: 'Storage Shelf',   icon: Archive },
    ]},
    { section: 'Reports', items: [
      { href: `/${slug}/audit`,  label: 'Audit Trail',    icon: History },
      { href: `/${slug}/alerts`, label: 'Alerts',         icon: Bell,  badge: 'alert' },
      { href: `/${slug}/staff`,  label: 'Staff',          icon: Users },
    ]},
  ]

  // Bottom nav items — 5 most used for mobile
  const BOTTOM_NAV = [
    { href: `/${slug}/dashboard`,      label: 'Home',      icon: LayoutDashboard },
    { href: `/${slug}/dispensing`,     label: 'Dispense',  icon: Send },
    { href: `/${slug}/or-verification`,label: 'Verify',    icon: ClipboardCheck, badge: 'or' },
    { href: `/${slug}/receiving`,      label: 'Receive',   icon: Inbox },
    { href: `/${slug}/alerts`,         label: 'Alerts',    icon: Bell, badge: 'alert' },
  ]

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_initials, hospitals(name)')
        .eq('id', authUser.id)
        .single()

      if (profile) {
        setUser({
          id: authUser.id,
          email: authUser.email || '',
          name: profile.full_name,
          role: profile.role.replace(/_/g, ' '),
          initials: profile.avatar_initials ||
            profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        })
        setHospitalName((profile.hospitals as any)?.name || '')

      // Load hospital branding
      const { data: h } = await supabase
        .from('hospitals')
        .select('accent_color, logo_url')
        .eq('slug', slug)
        .single()
      if (h?.accent_color) setAccentColor(h.accent_color)
      if (h?.logo_url) setLogoUrl(h.logo_url)
      }

      const { count: ac } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_resolved', false)
      setAlertCount(ac || 0)

      const { data: myDispenses } = await supabase
        .from('dispense_records').select('id, item_id').eq('received_by_id', authUser.id)
      if (myDispenses && myDispenses.length > 0) {
        const itemIds = myDispenses.map((d: any) => d.item_id)
        const { data: stillDispensed } = await supabase
          .from('inventory_items').select('id').eq('status', 'dispensed').in('id', itemIds)
        if (stillDispensed && stillDispensed.length > 0) {
          const dispIds = myDispenses
            .filter((d: any) => stillDispensed.some((s: any) => s.id === d.item_id)).map((d: any) => d.id)
          const { data: verified } = await supabase
            .from('or_verifications').select('dispense_record_id').in('dispense_record_id', dispIds)
          const verifiedIds = new Set((verified || []).map((v: any) => v.dispense_record_id))
          setOrPendingCount(dispIds.filter((id: string) => !verifiedIds.has(id)).length)
        } else {
          setOrPendingCount(0)
        }
      }
    }
    load()
  }, [pathname])

  // Apply accent color as CSS variable globally
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', accentColor)
    document.documentElement.style.setProperty('--brand-mid', accentColor)
    // Inject dynamic style overrides
    let styleTag = document.getElementById('accent-override') as HTMLStyleElement | null
    if (!styleTag) {
      styleTag = document.createElement('style')
      styleTag.id = 'accent-override'
      document.head.appendChild(styleTag)
    }
    const css = [
      ':root { --brand: ' + accentColor + '; --brand-mid: ' + accentColor + '; }',

      /* Tailwind brand classes */
      '.text-brand-500, .text-brand-400, .text-brand-300 { color: ' + accentColor + ' !important; }',
      '.bg-brand-50 { background: ' + accentColor + '18 !important; }',
      '.border-brand-300 { border-color: ' + accentColor + '66 !important; }',

      /* Buttons */
      '.btn-primary { background: ' + accentColor + ' !important; }',
      '.btn-primary:hover { background: ' + accentColor + 'dd !important; }',

      /* Bottom nav active tab labels */
      'nav a span[style] { }',

      /* Any element with teal inline color */
      '[style*="color: rgb(0, 201, 212)"] { color: ' + accentColor + ' !important; }',
      '[style*="color: #00C9D4"] { color: ' + accentColor + ' !important; }',
      '[style*="color: #00B8C2"] { color: ' + accentColor + ' !important; }',
      '[style*="color:#00C9D4"] { color: ' + accentColor + ' !important; }',
      '[style*="color:#00B8C2"] { color: ' + accentColor + ' !important; }',

      /* Any element with teal inline background */
      '[style*="background: rgb(0, 201, 212)"] { background: ' + accentColor + ' !important; }',
      '[style*="background: #00C9D4"] { background: ' + accentColor + ' !important; }',
      '[style*="background:#00C9D4"] { background: ' + accentColor + ' !important; }',
      '[style*="background-color: #00C9D4"] { background-color: ' + accentColor + ' !important; }',

      /* Gradient backgrounds with teal */
      '[style*="linear-gradient(135deg, #00C9D4"] { background: linear-gradient(135deg, ' + accentColor + ', ' + accentColor + 'aa) !important; }',
      '[style*="linear-gradient(90deg, #00C9D4"] { background: linear-gradient(90deg, ' + accentColor + ', ' + accentColor + 'aa) !important; }',

      /* Border teal */
      '[style*="border-color: #00C9D4"] { border-color: ' + accentColor + ' !important; }',
      '[style*="borderColor: #00C9D4"] { border-color: ' + accentColor + ' !important; }',
      '[style*="border-left: 4px solid #00C9D4"] { border-left-color: ' + accentColor + ' !important; }',
      '[style*="borderTop"][style*="#00C9D4"] { background: ' + accentColor + ' !important; }',

      /* Outline / box-shadow teal */
      '[style*="box-shadow"][style*="0, 201, 212"] { box-shadow: 0 0 0 3px ' + accentColor + '22 !important; }',

      /* Teal icon fills via stroke/fill */
      '[style*="stroke: #00C9D4"] { stroke: ' + accentColor + ' !important; }',
      '[style*="fill: #00C9D4"] { fill: ' + accentColor + ' !important; }',
    ].join('\n')
    styleTag.innerHTML = css
  }, [accentColor])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0A0F1E' }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 34, height: 34, borderRadius: 9, background: logoUrl ? '#fff' : `linear-gradient(135deg, ${accentColor}, #0088A9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', border: logoUrl ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
            ) : (
              <Shield size={16} className="text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div style={{ color: '#fff', fontWeight: 500, fontSize: 15, letterSpacing: '-0.3px' }}>SterileTrack</div>
            {hospitalName && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }} className="truncate">{hospitalName}</div>}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto" style={{ padding: '12px 10px' }}>
        {NAV.map((section: any) => (
          <div key={section.section} className="mb-5">
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', padding: '6px 8px 3px' }}>
              {section.section}
            </div>
            {section.items.map((item: any) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 1, fontSize: 13, cursor: 'pointer', transition: 'all 0.12s', color: active ? accentColor : 'rgba(255,255,255,0.5)', background: active ? `${accentColor}22` : 'transparent' }}>
                    <item.icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge === 'or' && orPendingCount > 0 && (
                      <span style={{ width: 18, height: 18, background: '#E83A3A', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
                    )}
                    {item.badge === 'alert' && alertCount > 0 && (
                      <span style={{ minWidth: 18, height: 18, background: '#E83A3A', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 9, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alertCount}</span>
                    )}
                    {active && <ChevronRight size={12} style={{ color: accentColor }} />}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}

        <div className="mb-5">
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', padding: '6px 8px 3px' }}>Hospital</div>
          <Link href={`/${slug}/settings`} onClick={() => setSidebarOpen(false)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 1, fontSize: 13, cursor: 'pointer', transition: 'all 0.12s', color: pathname === `/${slug}/settings` ? accentColor : 'rgba(255,255,255,0.5)', background: pathname === `/${slug}/settings` ? `rgba(0,201,212,0.1)` : 'transparent' }}>
              <SlidersHorizontal size={16} style={{ flexShrink: 0 }} />
              <span>Settings</span>
            </div>
          </Link>
        </div>

        {user?.email === SUPERADMIN_EMAIL && (
          <div className="mb-5">
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)', padding: '6px 8px 3px' }}>Admin</div>
            <Link href="/superadmin">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                <Settings size={16} />
                <span>Superadmin</span>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {user && (
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '12px 12px 14px', paddingBottom: 'calc(14px + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, color: '#fff' }}>
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500 }} className="truncate">{user.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }} className="truncate capitalize">{user.role}</div>
            </div>
            <button onClick={toggleTheme} style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 flex-col flex-shrink-0" style={{ background: '#0A0F1E' }}>
        <SidebarContent />
      </aside>

      {/* Mobile full-screen sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 flex flex-col" style={{ background: '#0A0F1E', paddingBottom: 80 }}>
            {/* Close button */}
            <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSidebarOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar — minimal, just logo + menu */}
        <div className="md:hidden flex items-center justify-between px-4 py-3"
          style={{ background: '#0A0F1E', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 26, height: 26, borderRadius: 7, background: logoUrl ? '#fff' : `linear-gradient(135deg, ${accentColor}, #0088A9)`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: logoUrl ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
              ) : (
                <Shield size={13} className="text-white" />
              )}
            </div>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#fff', letterSpacing: '-0.3px' }}>SterileTrack</span>
          </div>
          <NotificationsPanel slug={slug} initialCount={alertCount} />
          <button onClick={toggleTheme}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4 }}>
            <Menu size={22} />
          </button>
        </div>

        {/* Page content — add bottom padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto" style={{ background: '#EDEEF0', paddingBottom: 0 }}>
          <div className="md:pb-0 pb-20">
            {children}
          </div>
        </main>

        {/* ── MOBILE BOTTOM NAV ────────────────────────── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40"
          style={{
            background: '#0A0F1E',
            borderTop: '0.5px solid rgba(255,255,255,0.08)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}>
          <div style={{ display: 'flex', alignItems: 'stretch' }}>
            {BOTTOM_NAV.map((item: any) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const badgeCount = item.badge === 'alert' ? alertCount : item.badge === 'or' ? orPendingCount : 0
              return (
                <Link key={item.href} href={item.href} style={{ flex: 1, textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '10px 0 8px',
                    position: 'relative',
                  }}>
                    {/* Active indicator */}
                    {active && (
                      <div style={{
                        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                        width: 32, height: 2, borderRadius: 2,
                        background: `linear-gradient(90deg, ${accentColor}, ${accentColor})`,
                      }} />
                    )}

                    {/* Icon with badge */}
                    <div style={{ position: 'relative', marginBottom: 4 }}>
                      <item.icon
                        size={22}
                        style={{ color: active ? accentColor : 'rgba(255,255,255,0.35)' }}
                      />
                      {badgeCount > 0 && (
                        <div style={{
                          position: 'absolute', top: -4, right: -4,
                          minWidth: 16, height: 16,
                          background: '#E83A3A', color: '#fff',
                          fontSize: 9, fontWeight: 700, borderRadius: 8,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: '0 3px',
                        }}>
                          {item.badge === 'or' ? '!' : badgeCount > 9 ? '9+' : badgeCount}
                        </div>
                      )}
                    </div>

                    {/* Label */}
                    <span style={{
                      fontSize: 10, fontWeight: active ? 600 : 400,
                      color: active ? '#00C9D4' : 'rgba(255,255,255,0.35)',
                      letterSpacing: '0.01em',
                    }}>
                      {item.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
      <OnboardingWizard hospitalName={hospitalName} slug={slug} />
    </div>
  )
}
