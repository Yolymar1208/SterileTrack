'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { History, Search, User, MapPin, Clock, Download } from 'lucide-react'
import { AuditLog, ACTION_LABELS } from '@/lib/types'
import { format } from 'date-fns'

export default function AuditPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [filtered, setFiltered] = useState<AuditLog[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadLogs() }, [])
  useEffect(() => {
    if (!search) { setFiltered(logs); return }
    const q = search.toLowerCase()
    setFiltered(logs.filter(l =>
      l.item_name.toLowerCase().includes(q) ||
      l.performed_by_name.toLowerCase().includes(q) ||
      l.action.includes(q) ||
      (l.location || '').toLowerCase().includes(q)
    ))
  }, [logs, search])

  async function loadLogs() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setLogs(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  function exportCSV() {
    const headers = ['Date/Time', 'Item', 'QR Code', 'Action', 'By', 'Department', 'Location', 'Notes']
    const rows = filtered.map(l => [
      format(new Date(l.created_at), 'yyyy-MM-dd HH:mm'),
      l.item_name, l.item_qr_code,
      ACTION_LABELS[l.action] || l.action,
      l.performed_by_name, l.department || '', l.location || '', l.notes || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <History size={22} className="text-brand-500" /> Audit Trail
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete chain of custody — read-only, permanent record</p>
          </div>
          <button onClick={exportCSV} className="btn-secondary text-sm px-3 py-2">
            <Download size={14} /> Export CSV
          </button>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by item, action, staff member, location…"
              className="input-field pl-9"
            />
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading audit logs…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No records found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(log => (
                <div key={log.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm text-gray-800">{log.item_name}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-sm text-brand-600 font-medium">
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                        <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {log.item_qr_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={11} /> {log.performed_by_name}
                          {log.department && ` · ${log.department}`}
                        </span>
                        {log.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {log.location}
                          </span>
                        )}
                      </div>
                      {log.notes && (
                        <p className="text-xs text-gray-400 mt-1.5 italic">"{log.notes}"</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-gray-600">
                        {format(new Date(log.created_at), 'h:mm a')}
                      </div>
                      <div className="text-xs text-gray-400">
                        {format(new Date(log.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
