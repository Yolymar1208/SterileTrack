'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  Inbox, Send, Package, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, RefreshCw, Bell, ListChecks, Archive
} from 'lucide-react'
import { InventoryItem, AuditLog, STATUS_CONFIG, ACTION_LABELS } from '@/lib/types'

interface Stats {
  sterile_count: number
  dispensed_count: number
  received_count: number
  packed_count: number
  in_or_count: number
  missing_count: number
  damaged_count: number
  expiring_soon_count: number
  active_alerts_count: number
}

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
      else setUserName(user.email?.split('@')[0] || 'there')
    }
    const { data: statsData } = await supabase.from('dashboard_stats').select('*').single()
    if (statsData) setStats(statsData)
    const { data: items } = await supabase.from('inventory_items').select('*').order('updated_at', { ascending: false }).limit(5)
    setRecentItems(items || [])
    const { data: audit } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6)
    setRecentAudit(audit || [])
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {greeting}, {userName} ☀️
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <button onClick={loadAll} className="btn-secondary text-sm px-3 py-2">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Big workflow buttons */}
      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <Link href="/receiving">
          <div className="card p-6 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-brand-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
                <Inbox size={24} className="text-brand-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">CSSD Receiving Area</h2>
                <p className="text-xs text-gray-500">Receive · Inspect · Pack · Sterilize</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500">
                <span className="text-amber-600 font-medium">{stats?.received_count ?? 0}</span> awaiting inspection ·
                <span className="text-orange-600 font-medium ml-1">{stats?.packed_count ?? 0}</span> in sterilization
              </div>
              <ArrowRight size={16} className="text-brand-500" />
            </div>
          </div>
        </Link>

        <Link href="/dispensing">
          <div className="card p-6 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-brand-300">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                <Send size={24} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">CSSD Dispensing Area</h2>
                <p className="text-xs text-gray-500">Dispense sterile sets to OR staff</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="text-xs text-gray-500">
                <span className="text-green-600 font-medium">{stats?.sterile_count ?? 0}</span> ready to dispense ·
                <span className="text-blue-600 font-medium ml-1">{stats?.dispensed_count ?? 0}</span> at OR
              </div>
              <ArrowRight size={16} className="text-green-500" />
            </div>
          </div>
        </Link>
      </div>

      {/* Alert banner */}
      {stats && (stats.missing_count > 0 || stats.active_alerts_count > 0) && (
        <Link href="/alerts">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 hover:bg-red-100">
            <Bell size={16} className="text-red-500" />
            <p className="text-sm text-red-700 font-medium">
              {stats.missing_count > 0 && `${stats.missing_count} missing item${stats.missing_count > 1 ? 's' : ''}`}
              {stats.missing_count > 0 && stats.active_alerts_count > 0 && ' · '}
              {stats.active_alerts_count > 0 && `${stats.active_alerts_count} unresolved alert${stats.active_alerts_count > 1 ? 's' : ''}`}
            </p>
            <ArrowRight size={14} className="text-red-400 ml-auto" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Sterile Ready" value={stats?.sterile_count} icon={CheckCircle2} color="text-green-600 bg-green-50" href="/storage" />
        <StatCard label="At OR" value={stats?.dispensed_count} icon={Package} color="text-blue-600 bg-blue-50" />
        <StatCard label="Missing" value={stats?.missing_count} icon={AlertTriangle} color="text-red-600 bg-red-50" href="/alerts" />
        <StatCard label="Expiring Soon" value={stats?.expiring_soon_count} icon={Clock} color="text-amber-600 bg-amber-50" sub="within 7 days" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Link href="/sets" className="card p-3 hover:shadow-sm transition-all text-center">
          <ListChecks size={18} className="text-brand-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">Manage Sets</div>
        </Link>
        <Link href="/storage" className="card p-3 hover:shadow-sm transition-all text-center">
          <Archive size={18} className="text-teal-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">Storage Shelf</div>
        </Link>
        <Link href="/inventory" className="card p-3 hover:shadow-sm transition-all text-center">
          <Package size={18} className="text-gray-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">All Inventory</div>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800 text-sm">Recent Activity</h2>
          <Link href="/audit" className="text-brand-500 text-xs font-medium">Full audit trail</Link>
        </div>
        {loading ? <div className="text-sm text-gray-400 text-center py-4">Loading…</div>
        : recentAudit.length === 0 ? <div className="text-sm text-gray-400 text-center py-4">No activity yet</div>
        : (
          <div className="space-y-2">
            {recentAudit.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">{log.item_name}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-brand-600 font-medium">{ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}</span>
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

function StatCard({ label, value, color, sub, icon: Icon, href }: any) {
  const inner = (
    <div className={`card p-4 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-semibold text-gray-800">{value ?? '–'}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
