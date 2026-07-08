'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Building2, Users, Package, AlertTriangle,
  CheckCircle, Clock, XCircle, Plus, ChevronRight,
  TrendingUp, Shield, History, CreditCard, Activity
} from 'lucide-react'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#276749', bg: '#C6F6D5' },
  trial:     { label: 'Trial',     color: '#975A16', bg: '#FEFCBF' },
  inactive:  { label: 'Inactive',  color: '#9B2C2C', bg: '#FED7D7' },
  suspended: { label: 'Suspended', color: '#744210', bg: '#FEEBC8' },
}

type GlobalStats = {
  totalHospitals: number
  activeHospitals: number
  trialHospitals: number
  inactiveHospitals: number
  totalStaff: number
  totalSets: number
  totalAuditLogs: number
  totalAlerts: number
  mrr: number
  arr: number
}

export default function SuperadminPage() {
  const supabase = createClient()
  const [hospitals, setHospitals] = useState<any[]>([])
  const [stats, setStats]         = useState<GlobalStats | null>(null)
  const [loading, setLoading]     = useState(true)
  const [debugMsg, setDebugMsg]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const { data: hosps, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { setDebugMsg('Error: ' + error.message); setLoading(false); return }
    if (!hosps || hosps.length === 0) { setDebugMsg('No hospitals returned'); setLoading(false); return }

    const { data: plans } = await supabase.from('plans').select('*')
    const planMap = Object.fromEntries((plans || []).map((p: any) => [p.id, p]))

    // Global counts
    const [
      { count: totalStaff },
      { count: totalSets },
      { count: totalAuditLogs },
      { count: totalAlerts },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('item_type', 'instrument_set'),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('is_resolved', false),
    ])

    const enriched = await Promise.all(hosps.map(async (h: any) => {
      const [
        { count: staff_count },
        { count: set_count },
        { count: alert_count },
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('hospital_id', h.id),
        supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('hospital_id', h.id),
        supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('hospital_id', h.id).eq('is_resolved', false),
      ])
      return { ...h, plan: planMap[h.plan_id] || null, staff_count: staff_count || 0, set_count: set_count || 0, alert_count: alert_count || 0 }
    }))

    const activeHosps = enriched.filter(h => h.status === 'active')
    const mrr = activeHosps.reduce((sum, h) => sum + (h.plan?.price_monthly || 0), 0)

    setStats({
      totalHospitals:   enriched.length,
      activeHospitals:  activeHosps.length,
      trialHospitals:   enriched.filter(h => h.status === 'trial').length,
      inactiveHospitals: enriched.filter(h => h.status === 'inactive' || h.status === 'suspended').length,
      totalStaff:       totalStaff || 0,
      totalSets:        totalSets || 0,
      totalAuditLogs:   totalAuditLogs || 0,
      totalAlerts:      totalAlerts || 0,
      mrr,
      arr: mrr * 12,
    })

    setHospitals(enriched)
    setDebugMsg('')
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={22} className="text-brand-500" /> Superadmin Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all SterileTrack hospital accounts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/superadmin/billing"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
            <CreditCard size={15} /> Billing
          </Link>
          <Link href="/superadmin/hospitals/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)' }}>
            <Plus size={15} /> New Hospital
          </Link>
        </div>
      </div>

      {debugMsg && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{debugMsg}</div>
      )}

      {/* Global stats — 2 rows */}
      {stats && (
        <>
          {/* Row 1 — Hospital counts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Total Hospitals', value: stats.totalHospitals,   icon: Building2,   color: '#00C9D4' },
              { label: 'Active',          value: stats.activeHospitals,   icon: CheckCircle, color: '#38A169' },
              { label: 'On Trial',        value: stats.trialHospitals,    icon: Clock,       color: '#D69E2E' },
              { label: 'Inactive',        value: stats.inactiveHospitals, icon: XCircle,     color: '#E53E3E' },
            ].map(tile => (
              <div key={tile.label} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{tile.label}</span>
                  <tile.icon size={15} style={{ color: tile.color }} />
                </div>
                <div className="text-2xl font-semibold text-gray-800">{tile.value}</div>
              </div>
            ))}
          </div>

          {/* Row 2 — System-wide stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Staff',     value: stats.totalStaff.toLocaleString(),     icon: Users,         color: '#805AD5' },
              { label: 'Total Sets',      value: stats.totalSets.toLocaleString(),      icon: Package,       color: '#2B6CB0' },
              { label: 'Audit Logs',      value: stats.totalAuditLogs.toLocaleString(), icon: History,       color: '#00B8C2' },
              { label: 'Open Alerts',     value: stats.totalAlerts.toLocaleString(),    icon: AlertTriangle, color: '#E53E3E' },
            ].map(tile => (
              <div key={tile.label} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 font-medium">{tile.label}</span>
                  <tile.icon size={15} style={{ color: tile.color }} />
                </div>
                <div className="text-2xl font-semibold text-gray-800">{tile.value}</div>
              </div>
            ))}
          </div>

          {/* Revenue summary */}
          <div className="card p-4 mb-6" style={{ background: 'linear-gradient(135deg, #0A0F1E, #0D2030)', border: 'none' }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(0,201,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={20} color="#00C9D4" />
                </div>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Monthly Recurring Revenue</div>
                  <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-1px' }}>₱{stats.mrr.toLocaleString()}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Projected Annual</div>
                <div style={{ color: '#00C9D4', fontSize: 20, fontWeight: 700 }}>₱{stats.arr.toLocaleString()}</div>
                <Link href="/superadmin/billing"
                  style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, justifyContent: 'flex-end' }}>
                  View billing <ChevronRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hospitals list */}
      <div className="card divide-y divide-gray-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="font-medium text-gray-800 text-sm">All Hospitals</h2>
          <span className="text-xs text-gray-400">{hospitals.length} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : hospitals.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hospitals yet.</p>
            <Link href="/superadmin/hospitals/new" className="text-sm text-brand-500 font-medium mt-2 inline-block">
              Add your first hospital →
            </Link>
          </div>
        ) : hospitals.map(h => {
          const s = STATUS_STYLE[h.status] || STATUS_STYLE.inactive
          const isTrialExpired = h.status === 'trial' && h.trial_ends_at && new Date(h.trial_ends_at) < new Date()
          const daysLeft = h.trial_ends_at
            ? Math.max(0, Math.ceil((new Date(h.trial_ends_at).getTime() - Date.now()) / 86400000))
            : null

          return (
            <Link key={h.id} href={`/superadmin/hospitals/${h.id}`}>
              <div className="px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: h.logo_url ? '#fff' : 'linear-gradient(135deg, #E0FAFB, #B3F2F5)', border: h.logo_url ? '1px solid #E5E7EB' : 'none' }}>
                  {h.logo_url
                    ? <img src={h.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
                    : <Building2 size={18} style={{ color: '#00B8C2' }} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 truncate">{h.name}</span>
                    <span className="text-xs font-mono text-gray-400">/{h.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users size={11} /> {h.staff_count}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Package size={11} /> {h.set_count}
                    </span>
                    {h.alert_count > 0 && (
                      <span className="text-xs flex items-center gap-1" style={{ color: '#E53E3E' }}>
                        <AlertTriangle size={11} /> {h.alert_count}
                      </span>
                    )}
                    {h.plan && (
                      <span className="text-xs text-gray-400">
                        {h.plan.name} {h.plan.price_monthly > 0 ? `· ₱${h.plan.price_monthly.toLocaleString()}/mo` : '· Free'}
                      </span>
                    )}
                    {h.status === 'trial' && daysLeft !== null && !isTrialExpired && (
                      <span className="text-xs" style={{ color: '#D69E2E' }}>{daysLeft}d left</span>
                    )}
                    {isTrialExpired && (
                      <span className="text-xs font-medium" style={{ color: '#E53E3E' }}>Trial expired</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ color: s.color, background: s.bg }}>
                    {isTrialExpired ? 'Expired' : s.label}
                  </span>
                  <ChevronRight size={15} className="text-gray-300" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
