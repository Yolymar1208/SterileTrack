'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Package, Inbox, Send,
  Archive, ListChecks, History, Bell,
  Shield, LogOut, Menu, ChevronRight, Users
} from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { section: 'Main', items: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ]},
  { section: 'CSSD Workflow', items: [
    { href: '/receiving', label: 'Receiving Area', icon: Inbox, highlight: true },
    { href: '/dispensing', label: 'Dispensing Area', icon: Send, highlight: true },
  ]},
  { section: 'Management', items: [
    { href: '/inventory', label: 'Inventory', icon: Package },
    { href: '/sets', label: 'Instrument Sets', icon: ListChecks },
    { href: '/storage', label: 'Storage Shelf', icon: Archive },
  ]},
  { section: 'Reports', items: [
    { href: '/audit', label: 'Audit Trail', icon: History },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/staff', label: 'Staff Directory', icon: Users },
  ]},
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<{name: string; role: string; initials: string} | null>(null)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, avatar_initials')
        .eq('id', authUser.id)
        .single()
      if (profile) {
        setUser({
          name: profile.full_name,
          role: profile.role.replace(/_/g, ' '),
          initials: profile.avatar_initials || profile.full_name.split(' ').map((n:string) => n[0]).join('').toUpperCase()
        })
      } else {
        const name = authUser.email?.split('@')[0] || 'Staff'
        setUser({ name, role: 'staff', initials: name.slice(0,2).toUpperCase() })
      }
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('is_resolved', false)
      setAlertCount(count || 0)
    }
    load()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-400 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm">SterileTrack</div>
            <div className="text-white/40 text-xs">CSSD Management</div>
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
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-brand-400/20 text-brand-300'
                      : 'text-white/60 hover:text-white hover:bg-white/8',
                    item.highlight && !active && 'border border-white/10'
                  )}
                >
                  <item.icon size={17} />
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/alerts' && alertCount > 0 && (
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
          <div className="w-56 bg-brand-900 flex flex-col">
            <SidebarContent />
          </div>
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
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
