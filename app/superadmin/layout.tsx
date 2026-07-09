'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Shield, LayoutDashboard, Building2, LogOut, ChevronRight, CreditCard, Megaphone } from 'lucide-react'

const SUPERADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function guard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== SUPERADMIN_EMAIL) {
        router.push('/login')
      }
    }
    guard()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const NAV = [
    { href: '/superadmin',           label: 'Overview',   icon: LayoutDashboard },
    { href: '/superadmin/hospitals', label: 'Hospitals',  icon: Building2 },
    { href: '/superadmin/billing',        label: 'Billing',        icon: CreditCard },
    { href: '/superadmin/announcements', label: 'Announcements', icon: Megaphone },
  ]

  return (
    <div className="flex h-screen overflow-hidden">

      {/* Sidebar */}
      <aside className="hidden md:flex w-52 flex-col flex-shrink-0" style={{ background: '#0A0F1E' }}>
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
              <div style={{ color: '#fff', fontWeight: 500, fontSize: 15, letterSpacing: '-0.3px' }}>
                SterileTrack
              </div>
              <div style={{ color: '#00C9D4', fontSize: 10, fontWeight: 500 }}>
                Superadmin
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto" style={{ padding: '12px 10px' }}>
          <div className="mb-5">
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
              padding: '6px 8px 3px'
            }}>Management</div>

            {NAV.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 10px', borderRadius: 8, marginBottom: 1,
                    fontSize: 13, cursor: 'pointer', transition: 'all 0.12s',
                    color: active ? '#00C9D4' : 'rgba(255,255,255,0.5)',
                    background: active ? 'rgba(0,201,212,0.1)' : 'transparent',
                  }}>
                    <item.icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && <ChevronRight size={12} style={{ color: '#00C9D4' }} />}
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Back to BGHMC */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
              padding: '6px 8px 3px'
            }}>Quick Links</div>
            <Link href="/bghmc/dashboard">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 8,
                fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}>
                <Shield size={16} />
                <span>BGHMC Dashboard</span>
              </div>
            </Link>
          </div>
        </nav>

        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '12px 12px 14px' }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 500, color: '#fff'
            }}>YO</div>
            <div className="flex-1 min-w-0">
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500 }}>
                Yolymar Orfiano
              </div>
              <div style={{ color: '#00C9D4', fontSize: 10 }}>System Admin</div>
            </div>
            <button onClick={handleLogout}
              style={{ color: 'rgba(255,255,255,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto" style={{ background: '#EDEEF0' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
