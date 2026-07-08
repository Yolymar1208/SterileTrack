'use client'

import { useHospitalSlug } from '@/lib/hospital'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Bell, AlertTriangle, Clock, CheckCircle2, Package, X } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

interface Alert {
  id: string
  alert_type: string
  severity: string
  title: string
  body: string | null
  item_id: string | null
  item_name: string | null
  is_resolved: boolean
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export default function AlertsPage() {
  const supabase = createClient()
  const slug = useHospitalSlug()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showResolved, setShowResolved] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)

  useEffect(() => { loadAlerts() }, [showResolved])

  async function loadAlerts() {
    setLoading(true)
    let query = supabase.from('alerts').select('*').order('created_at', { ascending: false })
    if (!showResolved) query = query.eq('is_resolved', false)
    const { data } = await query
    setAlerts(data || [])
    setLoading(false)
  }

  async function resolveAlert(id: string) {
    setResolving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
    await supabase.from('alerts').update({
      is_resolved: true,
      resolved_by: profile?.full_name || user?.email?.split('@')[0] || 'Staff',
      resolved_at: new Date().toISOString(),
    }).eq('id', id)
    setResolving(false)
    setConfirmingId(null)
    loadAlerts()
  }

  // Enhanced severity config — color coded by type
  const severityConfig: Record<string, any> = {
    critical: {
      bg: 'bg-red-50 border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      iconBg: '#FEE2E2',
      badge: { bg: '#FEE2E2', color: '#B91C1C', label: 'Critical' },
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      icon: Clock,
      iconColor: 'text-amber-500',
      iconBg: '#FEF3C7',
      badge: { bg: '#FEF3C7', color: '#92400E', label: 'Warning' },
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: Bell,
      iconColor: 'text-blue-500',
      iconBg: '#EFF6FF',
      badge: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Info' },
    },
  }

  // Alert type labels and colors
  const typeConfig: Record<string, { label: string; bg: string; color: string }> = {
    quantity_discrepancy: { label: 'Qty Discrepancy', bg: '#FEE2E2', color: '#B91C1C' },
    or_discrepancy:       { label: 'OR Discrepancy',  bg: '#FEE2E2', color: '#B91C1C' },
    missing_item:         { label: 'Missing Item',    bg: '#FEE2E2', color: '#B91C1C' },
    expiring_soon:        { label: 'Expiring Soon',   bg: '#FEF3C7', color: '#92400E' },
    damaged_item:         { label: 'Damaged',         bg: '#FFEDD5', color: '#9A3412' },
  }

  return (
    <>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Bell size={22} className="text-brand-500" /> Alerts
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {alerts.filter(a => !a.is_resolved).length} active alerts
            </p>
          </div>
          <button onClick={() => setShowResolved(!showResolved)} className="btn-secondary text-sm px-3 py-2">
            {showResolved ? 'Hide resolved' : 'Show resolved'}
          </button>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Loading…</div>
        ) : alerts.length === 0 ? (
          <div className="card p-10 text-center">
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p className="font-semibold text-gray-700">All clear!</p>
            <p className="text-sm text-gray-400 mt-1">No active alerts right now. Great work, team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const cfg = severityConfig[alert.severity] || severityConfig.info
              const SevIcon = cfg.icon
              const typeCfg = typeConfig[alert.alert_type]
              return (
                <div key={alert.id}
                  className={`card border ${cfg.bg} ${alert.is_resolved ? 'opacity-55' : ''}`}
                  style={{ borderLeft: `4px solid ${alert.severity === 'critical' ? '#EF4444' : alert.severity === 'warning' ? '#F59E0B' : '#3B82F6'}` }}>
                  <div className="flex items-start gap-3 p-4">
                    {/* Icon with colored background */}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <SevIcon size={17} className={cfg.iconColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: cfg.badge.bg, color: cfg.badge.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {cfg.badge.label}
                        </span>
                        {typeCfg && (
                          <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 100, background: typeCfg.bg, color: typeCfg.color }}>
                            {typeCfg.label}
                          </span>
                        )}
                        {alert.is_resolved && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: '#DCFCE7', color: '#166534' }}>
                            ✓ Resolved
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-sm text-gray-800">{alert.title}</div>
                      {alert.body && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.body}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-gray-400">
                          {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                        </span>
                        {alert.item_id && alert.item_id !== '00000000-0000-0000-0000-000000000000' && (
                          <Link href={`/${slug}/inventory/${alert.item_id}`}
                            className="text-xs text-brand-500 font-medium flex items-center gap-1">
                            <Package size={11} /> View item
                          </Link>
                        )}
                        {alert.is_resolved && alert.resolved_by && (
                          <span className="text-xs text-green-600 font-medium">
                            by {alert.resolved_by}
                          </span>
                        )}
                      </div>
                    </div>
                    {!alert.is_resolved && (
                      <button onClick={() => setConfirmingId(alert.id)}
                        className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0">
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Resolve confirmation dialog */}
        {confirmingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-800 text-lg mb-2">Resolve this alert?</h3>
              <p className="text-sm text-gray-500 mb-6">
                This will mark the alert as resolved and record your name. This action is permanent.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmingId(null)}
                  className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button onClick={() => resolveAlert(confirmingId)} disabled={resolving}
                  className="btn-primary flex-1 justify-center bg-green-600 hover:bg-green-700">
                  {resolving ? 'Resolving…' : '✓ Yes, Resolve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
