'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Package, Inbox, Send,
  Archive, ListChecks, History, Bell,
  Shield, LogOut, Menu, ChevronRight, Users, ClipboardCheck
} from 'lucide-react'
import clsx from 'clsx'

type NavItem = {
  href: string
  label: string
  icon: any
  highlight?: boolean
  badge?: 'alert' | 'or'
}

type NavSection = {
  section: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  { section: 'Main', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'CSSD Workflow', items: [
    { href: '/dispensing',       label: 'Dispensing Area',  icon: Send,           highlight: true },
    { href: '/or-verification',  label: 'OR Verification',  icon: ClipboardCheck, highlight: true, badge: 'or' },
    { href: '/receiving',        label: 'Receiving Area',   icon: Inbox,          highlight: true },
  ]},
  { section: 'Management', items: [
    { href: '/inventory', label: 'Inventory',       icon: Package },
    { href: '/sets',      label: 'Instrument Sets', icon: ListChecks },
    { href: '/storage',   label: 'Storage Shelf',   icon: Archive },
  ]},
  { section: 'Reports', items: [
    { href: '/audit',  label: 'Audit Trail',     icon: History },
    { href: '/alerts', label: 'Alerts',           icon: Bell,  badge: 'alert' },
    { href: '/staff',  label: 'Staff Directory',  icon: Users },
  ]},
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [user, setUser]                 = useState<{ name: string; role: string; initials: string; id: string } | null>(null)
  const [alertCount, setAlertCount]     = useState(0)
  const [orPendingCount, setOrPendingCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles').select('full_name, role, avatar_initials').eq('id', authUser.id).single()

      if (profile) {
        setUser({
          id: authUser.id,
          name: profile.full_name,
          role: profile.role.replace(/_/g, ' '),
          initials: profile.avatar_initials ||
            profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        })
      } else {
        const name = authUser.email?.split('@')[0] || 'Staff'
        setUser({ id: authUser.id, name, role: 'staff', initials: name.slice(0, 2).toUpperCase() })
      }

      // Alert count
      const { count: ac } = await supabase
        .from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false)
      setAlertCount(ac || 0)

      // OR pending for this user
      const { data: myDispenses } = await supabase
        .from('dispense_records').select('id, item_id').eq('received_by_id', authUser.id)
      if (myDispenses && myDispenses.length > 0) {
        const itemIds = myDispenses.map(d => d.item_id)
        const { data: stillDispensed } = await supabase
          .from('inventory_items').select('id').eq('status', 'dispensed').in('id', itemIds)
        if (stillDispensed && stillDispensed.length > 0) {
          const dispIds = myDispenses
            .filter(d => stillDispensed.some((s: any) => s.id === d.item_id)).map(d => d.id)
          const { data: verified } = await supabase
            .from('or_verifications').select('dispense_record_id').in('dispense_record_id', dispIds)
          const verifiedIds = new Set((verified || []).map((v: any) => v.dispense_record_id))
          setOrPendingCount(dispIds.filter(id => !verifiedIds.has(id)).length)
        } else {
          setOrPendingCount(0)
        }
      } else {
        setOrPendingCount(0)
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

      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span style={{ color: '#fff', fontWeight: 500, fontSize: 17, letterSpacing: '-0.3px' }}>
                SterileTrack
              </span>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontStyle: 'italic' }}>
                by Yoly
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: '12px 10px' }}>
        {NAV.map(section => (
          <div key={section.section} className="mb-5">
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
              padding: '6px 8px 3px'
            }}>
              {section.section}
            </div>
            {section.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              const badgeCount = item.badge === 'alert' ? alertCount : item.badge === 'or' ? orPendingCount : 0
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                    fontSize: 13, fontWeight: 400, cursor: 'pointer',
                    transition: 'all 0.12s',
                    color: active ? '#00C9D4' : 'rgba(255,255,255,0.5)',
                    background: active ? 'rgba(0,201,212,0.1)' : 'transparent',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLDivElement).style.color = active ? '#00C9D4' : 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = active ? '#00C9D4' : 'rgba(255,255,255,0.5)' }}
                  >
                    <item.icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>

                    {/* OR ! badge */}
                    {item.badge === 'or' && orPendingCount > 0 && (
                      <span style={{
                        width: 18, height: 18, background: '#E83A3A', color: '#fff',
                        fontSize: 10, fontWeight: 600, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>!</span>
                    )}
                    {/* Alert count badge */}
                    {item.badge === 'alert' && alertCount > 0 && (
                      <span style={{
                        minWidth: 18, height: 18, background: '#E83A3A', color: '#fff',
                        fontSize: 10, fontWeight: 600, borderRadius: 9, padding: '0 5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>{alertCount}</span>
                    )}
                    {active && <ChevronRight size={12} style={{ color: '#00C9D4', flexShrink: 0 }} />}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      {user && (
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '12px 12px 14px' }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 500, color: '#fff'
            }}>
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500 }} className="truncate">
                {user.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }} className="truncate capitalize">
                {user.role}
              </div>
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

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-52 flex flex-col" style={{ background: '#0A0F1E' }}>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile topbar */}
        <div className="md:hidden bg-white px-4 py-3 flex items-center gap-3" style={{ borderBottom: '0.5px solid #EAECF0' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer' }}>
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={13} className="text-white" />
            </div>
            <span style={{ fontWeight: 500, fontSize: 15, color: '#0D1117', letterSpacing: '-0.3px' }}>
              SterileTrack
            </span>
          </div>
          {orPendingCount > 0 && (
            <span style={{
              marginLeft: 'auto', width: 20, height: 20, background: '#E83A3A',
              color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>!</span>
          )}
        </div>

        <main className="flex-1 overflow-y-auto" style={{ background: '#F7F8FA' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
