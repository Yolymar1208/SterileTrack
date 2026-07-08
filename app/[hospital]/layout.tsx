'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Package, Inbox, Send,
  Archive, ListChecks, History, Bell,
  Shield, LogOut, Menu, ChevronRight,
  Users, ClipboardCheck, Settings, X
} from 'lucide-react'

const SUPERADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  const params   = useParams()
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const slug     = params?.hospital as string

  const [sidebarOpen, setSidebarOpen]       = useState(false)
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: '#0A0F1E' }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={16} className="text-white" />
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 1, fontSize: 13, cursor: 'pointer', transition: 'all 0.12s', color: active ? '#00C9D4' : 'rgba(255,255,255,0.5)', background: active ? 'rgba(0,201,212,0.1)' : 'transparent' }}>
                    <item.icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge === 'or' && orPendingCount > 0 && (
                      <span style={{ width: 18, height: 18, background: '#E83A3A', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
                    )}
                    {item.badge === 'alert' && alertCount > 0 && (
                      <span style={{ minWidth: 18, height: 18, background: '#E83A3A', color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 9, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alertCount}</span>
                    )}
                    {active && <ChevronRight size={12} style={{ color: '#00C9D4' }} />}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}

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
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={13} className="text-white" />
            </div>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#fff', letterSpacing: '-0.3px' }}>SterileTrack</span>
          </div>
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
                        background: 'linear-gradient(90deg, #00C9D4, #0088A9)',
                      }} />
                    )}

                    {/* Icon with badge */}
                    <div style={{ position: 'relative', marginBottom: 4 }}>
                      <item.icon
                        size={22}
                        style={{ color: active ? '#00C9D4' : 'rgba(255,255,255,0.35)' }}
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
    </div>
  )
}
