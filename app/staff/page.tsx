'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Users, Search, Edit2, Save, X, QrCode } from 'lucide-react'
import { Profile } from '@/lib/types'

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQr, setEditQr] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setStaff(data || []); setLoading(false)
  }

  async function saveQr(id: string) {
    await supabase.from('profiles').update({ qr_code: editQr.trim().toUpperCase() || null }).eq('id', id)
    setStaff(s => s.map(p => p.id === id ? { ...p, qr_code: editQr.trim().toUpperCase() || null } : p))
    setEditingId(null); setEditQr('')
  }

  const filtered = staff.filter(s => !search ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.qr_code || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={22} className="text-brand-500" /> Staff Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">Assign QR codes to staff for dispensing accountability</p>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name or QR code…"
              className="input-field pl-9" />
          </div>
        </div>

        <div className="card divide-y divide-gray-50">
          {loading ? <div className="p-8 text-center text-gray-400">Loading…</div>
          : filtered.length === 0 ? <div className="p-8 text-center text-gray-400">No staff found. Add staff in Supabase → Authentication → Users.</div>
          : filtered.map(p => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 text-xs font-bold">
                {p.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{p.full_name}</div>
                <div className="text-xs text-gray-400 capitalize">
                  {p.role.replace(/_/g, ' ')}
                  {p.department && ` · ${p.department}`}
                </div>
              </div>
              {editingId === p.id ? (
                <div className="flex gap-1 items-center">
                  <input type="text" value={editQr}
                    onChange={e => setEditQr(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveQr(p.id)}
                    placeholder="STAFF-001"
                    className="input-field font-mono text-sm w-32" autoFocus />
                  <button onClick={() => saveQr(p.id)} className="p-2 text-green-500 hover:bg-green-50 rounded-lg">
                    <Save size={14} />
                  </button>
                  <button onClick={() => { setEditingId(null); setEditQr('') }} className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  {p.qr_code ? (
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-700 flex items-center gap-1">
                      <QrCode size={11} /> {p.qr_code}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No QR code</span>
                  )}
                  <button onClick={() => { setEditingId(p.id); setEditQr(p.qr_code || '') }}
                    className="text-xs text-brand-500 font-medium p-2 hover:bg-brand-50 rounded-lg flex items-center gap-1">
                    <Edit2 size={11} /> {p.qr_code ? 'Edit' : 'Assign'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
