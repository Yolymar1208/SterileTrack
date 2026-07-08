'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

type Alert = {
  id: string
  title: string
  body: string
  alert_type: string
  is_resolved: boolean
  created_at: string
}

type Props = {
  slug: string
  initialCount?: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

const ALERT_COLORS: Record<string, { bg: string; color: string }> = {
  quantity_discrepancy: { bg: '#FEE2E2', color: '#B91C1C' },
  or_discrepancy:       { bg: '#FEE2E2', color: '#B91C1C' },
  missing_item:         { bg: '#FEE2E2', color: '#B91C1C' },
  expiring_soon:        { bg: '#FEFCBF', color: '#92400E' },
  damaged_item:         { bg: '#FEEBC8', color: '#92400E' },
}

export default function NotificationsPanel({ slug, initialCount = 0 }: Props) {
  const supabase    = createClient()
  const panelRef    = useRef<HTMLDivElement>(null)
  const [open, setOpen]       = useState(false)
  const [alerts, setAlerts]   = useState<Alert[]>([])
  const [count, setCount]     = useState(initialCount)
  const [loading, setLoading] = useState(false)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load alerts when opened
  async function loadAlerts() {
    setLoading(true)
    const { data } = await supabase
      .from('alerts')
      .select('id, title, body, alert_type, is_resolved, created_at')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(10)
    setAlerts(data || [])
    setCount(data?.length || 0)
    setLoading(false)
  }

  function toggle() {
    if (!open) loadAlerts()
    setOpen(o => !o)
  }

  async function resolveAlert(id: string) {
    await supabase.from('alerts').update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq('id', id)
    setAlerts(a => a.filter(x => x.id !== id))
    setCount(c => Math.max(0, c - 1))
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button onClick={toggle}
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: 6, color: 'rgba(255,255,255,0.5)',
          borderRadius: 8, display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}
        onMouseOver={e => (e.currentTarget.style.color = '#fff')}
        onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
        <Bell size={20} />
        {count > 0 && (
          <div style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#E83A3A', color: '#fff',
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '1.5px solid #0A0F1E',
          }}>
            {count > 9 ? '9+' : count}
          </div>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 480, overflowY: 'auto',
          background: '#fff', borderRadius: 14,
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          border: '0.5px solid #EDEEF0',
          zIndex: 200,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 12px',
            borderBottom: '1px solid #F3F4F6',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0A0F1E' }}>Notifications</div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                {count > 0 ? `${count} unresolved alert${count > 1 ? 's' : ''}` : 'All clear'}
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          {/* Alert list */}
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
          ) : alerts.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <CheckCircle size={28} color="#38A169" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>All clear!</div>
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>No unresolved alerts</div>
            </div>
          ) : alerts.map(alert => {
            const colors = ALERT_COLORS[alert.alert_type] || { bg: '#F3F4F6', color: '#374151' }
            return (
              <div key={alert.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid #F9FAFB',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: colors.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AlertTriangle size={14} color={colors.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#0A0F1E', marginBottom: 2 }}>{alert.title}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{alert.body}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 4 }}>{timeAgo(alert.created_at)}</div>
                </div>
                <button onClick={() => resolveAlert(alert.id)}
                  title="Mark resolved"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, flexShrink: 0 }}>
                  <CheckCircle size={15} />
                </button>
              </div>
            )
          })}

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6' }}>
            <Link href={`/${slug}/alerts`}
              onClick={() => setOpen(false)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: '#00B8C2', textDecoration: 'none' }}>
              View all alerts <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
