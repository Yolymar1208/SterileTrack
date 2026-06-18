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
    { href: '/dispensing', label: 'Dispensing Area', icon: Send, highlight: true },
    { href: '/or-verification', label: 'OR Verification', icon: ClipboardCheck, highlight: true, badge: 'or' },
    { href: '/receiving', label: 'Receiving Area', icon: Inbox, highlight: true },
  ]},
  { section: 'Management', items: [
    { href: '/inventory', label: 'Inventory', icon: Package },
    { href: '/sets', label: 'Instrument Sets', icon: ListChecks },
    { href: '/storage', label: 'Storage Shelf', icon: Archive },
  ]},
  { section: 'Reports', items: [
    { href: '/audit', label: 'Audit Trail', icon: History },
    { href: '/alerts', label: 'Alerts', icon: Bell, badge: 'alert' },
    { href: '/staff', label: 'Staff Directory', icon: Users },
  ]},
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{ name: string; role: string; initials: string; id: string } | null>(null)
  const [alertCount, setAlertCount] = useState(0)
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
            profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
        })
      } else {
        const name = authUser.email?.split('@')[0] || 'Staff'
        setUser({ id: authUser.id, name, role: 'staff', initials: name.slice(0, 2).toUpperCase() })
      }

      // Alert count
      const { count: ac } = await supabase
        .from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false)
      setAlertCount(ac || 0)

      // OR pending — only items dispensed TO this user that are unverified
      const { data: myDispenses } = await supabase
        .from('dispense_records')
        .select('id, item_id')
        .eq('received_by_id', authUser.id)

      if (myDispenses && myDispenses.length > 0) {
        // Filter to items still dispensed
        const itemIds = myDispenses.map(d => d.item_id)
        const { data: stillDispensed } = await supabase
          .from('inventory_items')
          .select('id')
          .eq('status', 'dispensed')
          .in('id', itemIds)

        if (stillDispensed && stillDispensed.length > 0) {
          const dispIds = myDispenses
            .filter(d => stillDispensed.some(s => s.id === d.item_id))
            .map(d => d.id)

          // Check which have verifications
          const { data: verified } = await supabase
            .from('or_verifications')
            .select('dispense_record_id')
            .in('dispense_record_id', dispIds)

          const verifiedIds = new Set((verified || []).map((v: any) => v.dispense_record_id))
          const pending = dispIds.filter(id => !verifiedIds.has(id)).length
          setOrPendingCount(pending)
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-white font-bold text-lg leading-tight">SterileTrack</span>
              <span className="text-white/25 text-[10px] italic">by Yoly</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {NAV.map(section => (
          <div key={section.section} className="mb-5">
            <div className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-1">
              {section.section}
            </div>
            {section.items.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-brand-400/20 text-brand-300'
                      : 'text-white/60 hover:text-white hover:bg-white/8',
                    item.highlight && !active && 'border border-white/10'
                  )}>
                  <item.icon size={17} />
                  <span className="flex-1">{item.label}</span>

                  {/* Red ! for OR Verification — only when user has pending items */}
                  {item.badge === 'or' && orPendingCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                      !
                    </span>
                  )}

                  {/* Count badge for alerts */}
                  {item.badge === 'alert' && alertCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {alertCount}
                    </span>
                  )}

                  {active && <ChevronRight size={13} className="text-brand-300" />}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {user && (
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 bg-brand-400/30 rounded-full flex items-center justify-center text-brand-300 text-xs font-bold">
              {user.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-medium truncate">{user.name}</div>
              <div className="text-white/40 text-[10px] capitalize truncate">{user.role}</div>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-white/70 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-56 bg-brand-900 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-brand-900 flex flex-col"><SidebarContent /></div>
          <div className="flex-1 bg-black/50" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-brand-500" />
            <span className="font-semibold text-brand-900 text-sm">SterileTrack</span>
          </div>
          {orPendingCount > 0 && (
            <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              !
            </span>
          )}
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
