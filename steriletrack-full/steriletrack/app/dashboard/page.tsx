'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  Package, AlertTriangle, Clock, TrendingUp, QrCode,
  Droplets, Wrench, Flame, Archive, CheckCircle2,
  Bell, ArrowRight, RefreshCw
} from 'lucide-react'
import { InventoryItem, AuditLog, STATUS_CONFIG } from '@/lib/types'

interface Stats {
  sterile_count: number
  in_or_count: number
  decon_count: number
  assembly_count: number
  sterilization_count: number
  missing_count: number
  damaged_count: number
  expiring_soon_count: number
  active_alerts_count: number
}

const WORKFLOW_STEPS = [
  { key: 'decon_count', label: 'Decontamination', icon: Droplets, href: '/workflow/decontamination', color: 'text-yellow-600 bg-yellow-50' },
  { key: 'assembly_count', label: 'Assembly', icon: Wrench, href: '/workflow/assembly', color: 'text-purple-600 bg-purple-50' },
  { key: 'sterilization_count', label: 'Sterilization', icon: Flame, href: '/workflow/sterilization', color: 'text-orange-600 bg-orange-50' },
  { key: 'sterile_count', label: 'Ready / Sterile', icon: CheckCircle2, href: '/inventory', color: 'text-green-600 bg-green-50' },
]

export default function DashboardPage() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<InventoryItem[]>([])
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([])
  const [greeting, setGreeting] = useState('')
  const [userName, setUserName] = useState('there')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (profile) setUserName(profile.full_name.split(' ')[0])
    }

    const { data: statsData } = await supabase.from('dashboard_stats').select('*').single()
    if (statsData) setStats(statsData)

    const { data: items } = await supabase
      .from('inventory_items')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5)
    setRecentItems(items || [])

    const { data: audit } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
    setRecentAudit(audit || [])

    setLoading(false)
  }

  const StatCard = ({ label, value, color, sub, icon: Icon, href }: {
    label: string; value: number | null; color: string; sub?: string; icon: any; href?: string
  }) => {
    const inner = (
      <div className={`card p-4 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon size={18} />
          </div>
          {href && <ArrowRight size={14} className="text-gray-300 mt-1" />}
        </div>
        <div className="text-2xl font-semibold text-gray-800 mb-0.5">
          {loading ? '–' : value ?? 0}
        </div>
        <div className="text-xs text-gray-500">{label}</div>
        {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    )
    return href ? <Link href={href}>{inner}</Link> : inner
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {greeting}, {userName} {['☀️','🌤️','🌙'][['morning','afternoon','evening'].indexOf(greeting.split(' ')[1]) ?? 0]}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="btn-secondary text-sm px-3 py-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link href="/scan" className="btn-primary text-sm px-4 py-2">
            <QrCode size={15} /> Scan Now
          </Link>
        </div>
      </div>

      {/* Alerts banner */}
      {stats && (stats.missing_count > 0 || stats.active_alerts_count > 0) && (
        <Link href="/alerts">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 hover:bg-red-100 transition-colors">
            <Bell size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">
              {stats.missing_count > 0 && `${stats.missing_count} missing item${stats.missing_count > 1 ? 's' : ''}`}
              {stats.missing_count > 0 && stats.active_alerts_count > 0 && ' · '}
              {stats.active_alerts_count > 0 && `${stats.active_alerts_count} unresolved alert${stats.active_alerts_count > 1 ? 's' : ''}`}
            </p>
            <ArrowRight size={14} className="text-red-400 ml-auto" />
          </div>
        </Link>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Sterile & Ready" value={stats?.sterile_count ?? null} icon={CheckCircle2} color="text-green-600 bg-green-50" href="/inventory" />
        <StatCard label="In OR Now" value={stats?.in_or_count ?? null} icon={Package} color="text-blue-600 bg-blue-50" />
        <StatCard label="Missing Items" value={stats?.missing_count ?? null} icon={AlertTriangle} color="text-red-600 bg-red-50" href="/alerts" />
        <StatCard label="Expiring Soon" value={stats?.expiring_soon_count ?? null} icon={Clock} color="text-amber-600 bg-amber-50" sub="within 7 days" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        {/* Workflow pipeline */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-800 text-sm">Workflow Pipeline</h2>
            <TrendingUp size={15} className="text-gray-400" />
          </div>
          <div className="space-y-2">
            {WORKFLOW_STEPS.map(step => {
              const count = stats ? (stats as any)[step.key] as number : 0
              return (
                <Link key={step.key} href={step.href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${step.color}`}>
                      <step.icon size={15} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">{step.label}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-semibold ${count > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
                        {loading ? '–' : count}
                      </span>
                      <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent items */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-800 text-sm">Recently Updated</h2>
            <Link href="/inventory" className="text-brand-500 text-xs font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="text-sm text-gray-400 text-center py-4">Loading…</div>
            ) : recentItems.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">No items found</div>
            ) : recentItems.map(item => {
              const cfg = STATUS_CONFIG[item.status]
              return (
                <Link key={item.id} href={`/inventory/${item.id}`}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 truncate">{item.name}</div>
                      <div className="text-xs text-gray-400 truncate">{item.location || 'No location'}</div>
                    </div>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap status-${item.status}`}>
                      {cfg.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent audit log */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800 text-sm">Recent Activity</h2>
          <Link href="/audit" className="text-brand-500 text-xs font-medium">Full audit trail</Link>
        </div>
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-4">Loading…</div>
        ) : recentAudit.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">No activity yet</div>
        ) : (
          <div className="space-y-2">
            {recentAudit.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">{log.item_name}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-brand-600 font-medium">{log.action.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    By {log.performed_by_name}
                    {log.location && ` · ${log.location}`}
                    {' · '}{format(new Date(log.created_at), 'h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
