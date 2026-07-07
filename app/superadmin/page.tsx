'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Building2, Users, Package, AlertTriangle,
  CheckCircle, Clock, XCircle, Plus, ChevronRight,
  TrendingUp, Shield
} from 'lucide-react'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#276749', bg: '#C6F6D5' },
  trial:     { label: 'Trial',     color: '#975A16', bg: '#FEFCBF' },
  inactive:  { label: 'Inactive',  color: '#9B2C2C', bg: '#FED7D7' },
  suspended: { label: 'Suspended', color: '#744210', bg: '#FEEBC8' },
}

export default function SuperadminPage() {
  const supabase = createClient()
  const [hospitals, setHospitals] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [debugMsg, setDebugMsg]   = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    // Simple direct query — no joins
    const { data: hosps, error } = await supabase
      .from('hospitals')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setDebugMsg('Error: ' + error.message)
      setLoading(false)
      return
    }

    if (!hosps || hosps.length === 0) {
      setDebugMsg('No hospitals returned from query')
      setLoading(false)
      return
    }

    // Fetch plans separately
    const { data: plans } = await supabase.from('plans').select('*')
    const planMap = Object.fromEntries((plans || []).map((p: any) => [p.id, p]))

    // Fetch stats for each hospital
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
      return {
        ...h,
        plan: planMap[h.plan_id] || null,
        staff_count: staff_count || 0,
        set_count: set_count || 0,
        alert_count: alert_count || 0,
      }
    }))

    setHospitals(enriched)
    setDebugMsg('')
    setLoading(false)
  }

  const total  = hospitals.length
  const active = hospitals.filter(h => h.status === 'active').length
  const trial  = hospitals.filter(h => h.status === 'trial').length
  const mrr    = hospitals
    .filter(h => h.status === 'active')
    .reduce((sum, h) => sum + (h.plan?.price_monthly || 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Shield size={22} className="text-brand-500" /> Superadmin Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage all SterileTrack hospital accounts</p>
        </div>
        <Link href="/superadmin/hospitals/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)' }}>
          <Plus size={15} /> New Hospital
        </Link>
      </div>

      {/* Debug message */}
      {debugMsg && (
        <div className="mb-4 p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
          {debugMsg}
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Hospitals', value: total,  icon: Building2,   color: '#00C9D4' },
          { label: 'Active',          value: active,  icon: CheckCircle, color: '#38A169' },
          { label: 'On Trial',        value: trial,   icon: Clock,       color: '#D69E2E' },
          { label: 'MRR (PHP)',       value: `₱${mrr.toLocaleString()}`, icon: TrendingUp, color: '#805AD5' },
        ].map(tile => (
          <div key={tile.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{tile.label}</span>
              <tile.icon size={16} style={{ color: tile.color }} />
            </div>
            <div className="text-2xl font-semibold text-gray-800">{tile.value}</div>
          </div>
        ))}
      </div>

      {/* Hospitals list */}
      <div className="card divide-y divide-gray-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <h2 className="font-medium text-gray-800 text-sm">All Hospitals</h2>
          <span className="text-xs text-gray-400">{total} total</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : hospitals.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hospitals found.</p>
            <Link href="/superadmin/hospitals/new"
              className="text-sm text-brand-500 font-medium mt-2 inline-block">
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #E0FAFB, #B3F2F5)' }}>
                  <Building2 size={18} style={{ color: '#00B8C2' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800 truncate">{h.name}</span>
                    <span className="text-xs font-mono text-gray-400">/{h.slug}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Users size={11} /> {h.staff_count} staff
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Package size={11} /> {h.set_count} sets
                    </span>
                    {h.alert_count > 0 && (
                      <span className="text-xs flex items-center gap-1" style={{ color: '#E53E3E' }}>
                        <AlertTriangle size={11} /> {h.alert_count} alerts
                      </span>
                    )}
                    {h.plan && (
                      <span className="text-xs text-gray-400">
                        {h.plan.name} {h.plan.price_monthly > 0 ? `· ₱${h.plan.price_monthly.toLocaleString()}/mo` : '· Free'}
                      </span>
                    )}
                    {h.status === 'trial' && daysLeft !== null && !isTrialExpired && (
                      <span className="text-xs" style={{ color: '#D69E2E' }}>{daysLeft}d left in trial</span>
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
