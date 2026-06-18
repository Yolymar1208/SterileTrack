'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { History, Search, User, MapPin, Clock, Download, ChevronDown, ChevronRight, Package } from 'lucide-react'
import { AuditLog, ACTION_LABELS } from '@/lib/types'
import { format } from 'date-fns'

interface GroupedLogs {
  itemName: string
  itemQr: string
  itemId: string
  logs: AuditLog[]
  expanded: boolean
}

export default function AuditPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [grouped, setGrouped] = useState<GroupedLogs[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'grouped' | 'flat'>('grouped')

  useEffect(() => { loadLogs() }, [])

  useEffect(() => {
    buildGroups(logs, search)
  }, [logs, search])

  async function loadLogs() {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    setLogs(data || [])
    setLoading(false)
  }

  function buildGroups(allLogs: AuditLog[], q: string) {
    const filtered = q ? allLogs.filter(l =>
      l.item_name.toLowerCase().includes(q.toLowerCase()) ||
      l.performed_by_name.toLowerCase().includes(q.toLowerCase()) ||
      l.action.includes(q.toLowerCase()) ||
      (l.location || '').toLowerCase().includes(q.toLowerCase()) ||
      (l.notes || '').toLowerCase().includes(q.toLowerCase())
    ) : allLogs

    const map = new Map<string, GroupedLogs>()
    filtered.forEach(log => {
      const key = log.item_id
      if (!map.has(key)) {
        map.set(key, {
          itemName: log.item_name,
          itemQr: log.item_qr_code,
          itemId: log.item_id,
          logs: [],
          expanded: false,
        })
      }
      map.get(key)!.logs.push(log)
    })
    setGrouped(Array.from(map.values()))
  }

  function toggleGroup(itemId: string) {
    setGrouped(g => g.map(grp => grp.itemId === itemId ? { ...grp, expanded: !grp.expanded } : grp))
  }

  function expandAll() {
    setGrouped(g => g.map(grp => ({ ...grp, expanded: true })))
  }

  function exportCSV() {
    const headers = ['Date/Time', 'Item', 'QR Code', 'Action', 'By', 'Department', 'Location', 'Notes']
    const filteredLogs = search ? logs.filter(l =>
      l.item_name.toLowerCase().includes(search.toLowerCase()) ||
      l.performed_by_name.toLowerCase().includes(search.toLowerCase())
    ) : logs
    const rows = filteredLogs.map(l => [
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

  const isSetEdit = (action: string) => action === 'set_contents_updated'

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <History size={22} className="text-brand-500" /> Audit Trail
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Permanent chain of custody — grouped by instrument set
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn-secondary text-sm px-3 py-2">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>

        <div className="card p-4 mb-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by item, action, staff, location…"
                className="input-field pl-9" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setView('grouped')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${view === 'grouped' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                By Item
              </button>
              <button onClick={() => setView('flat')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${view === 'flat' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Timeline
              </button>
              {view === 'grouped' && (
                <button onClick={expandAll} className="btn-secondary text-sm px-3 py-2">Expand All</button>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Loading audit logs…</div>
        ) : view === 'grouped' ? (
          /* GROUPED VIEW */
          <div className="space-y-2">
            {grouped.length === 0 ? (
              <div className="card p-8 text-center text-gray-400">No records found</div>
            ) : grouped.map(grp => (
              <div key={grp.itemId} className="card overflow-hidden">
                {/* Group header */}
                <button onClick={() => toggleGroup(grp.itemId)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package size={15} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{grp.itemName}</div>
                    <div className="text-xs text-gray-400 font-mono">{grp.itemQr} · {grp.logs.length} event{grp.logs.length > 1 ? 's' : ''}</div>
                  </div>
                  {grp.logs.some(l => isSetEdit(l.action)) && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Has edits</span>
                  )}
                  {grp.expanded
                    ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
                </button>

                {/* Expanded logs */}
                {grp.expanded && (
                  <div className="border-t border-gray-50">
                    {grp.logs.map((log, i) => (
                      <div key={log.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 ${isSetEdit(log.action) ? 'bg-blue-50' : ''}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              isSetEdit(log.action) ? 'bg-blue-100 text-blue-700' : 'bg-brand-50 text-brand-700'
                            }`}>
                              {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                            <span className="flex items-center gap-1"><User size={10} /> {log.performed_by_name}</span>
                            {log.location && <span className="flex items-center gap-1"><MapPin size={10} /> {log.location}</span>}
                            <span className="flex items-center gap-1"><Clock size={10} /> {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                          </div>
                          {log.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic bg-white rounded px-2 py-1 border border-gray-100">
                              "{log.notes}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* FLAT TIMELINE VIEW */
          <div className="card">
            {logs.filter(l => !search || l.item_name.toLowerCase().includes(search.toLowerCase()) ||
              l.performed_by_name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
              <div className="p-8 text-center text-gray-400">No records found</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {logs.filter(l => !search ||
                  l.item_name.toLowerCase().includes(search.toLowerCase()) ||
                  l.performed_by_name.toLowerCase().includes(search.toLowerCase()) ||
                  (l.notes || '').toLowerCase().includes(search.toLowerCase())
                ).map(log => (
                  <div key={log.id} className={`px-5 py-4 ${isSetEdit(log.action) ? 'bg-blue-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm text-gray-800">{log.item_name}</span>
                          <span className="text-gray-300">·</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isSetEdit(log.action) ? 'bg-blue-100 text-blue-700' : 'bg-brand-50 text-brand-600'
                          }`}>
                            {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                          </span>
                          <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                            {log.item_qr_code}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1"><User size={10} /> {log.performed_by_name}</span>
                          {log.location && <span className="flex items-center gap-1"><MapPin size={10} /> {log.location}</span>}
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
        )}
      </div>
    </AppLayout>
  )
}
