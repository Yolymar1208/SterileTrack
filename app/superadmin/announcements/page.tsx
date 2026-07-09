'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Megaphone, Plus, Trash2, ArrowLeft, X } from 'lucide-react'
import Link from 'next/link'

type Announcement = {
  id: string
  title: string
  body: string
  type: string
  is_active: boolean
  created_at: string
}

export default function AnnouncementsPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ title: '', body: '', type: 'info' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.title || !form.body) return
    setSaving(true)
    await supabase.from('announcements').insert({ title: form.title, body: form.body, type: form.type, is_active: true })
    setForm({ title: '', body: '', type: 'info' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('announcements').update({ is_active: !current }).eq('id', id)
    load()
  }

  async function deleteAnn(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    load()
  }

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13, border: '1px solid #E5E7EB', outline: 'none', background: '#F9FAFB', color: '#0D1117' }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Overview
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Megaphone size={22} className="text-brand-500" /> Announcements
          </h1>
          <p className="text-sm text-gray-500 mt-1">Send notices to all hospital accounts</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)' }}>
          <Plus size={15} /> New Announcement
        </button>
      </div>

      {/* New announcement form */}
      {showForm && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-gray-800 text-sm">New Announcement</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Type</label>
              <select style={inputStyle} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="info">Info — blue</option>
                <option value="warning">Warning — yellow</option>
                <option value="critical">Critical — red</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Scheduled maintenance" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Message *</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' } as any} rows={3} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Announcement details..." />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm flex-1 justify-center">Cancel</button>
              <button onClick={handleSave} disabled={!form.title || !form.body || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: form.title && form.body && !saving ? 'linear-gradient(135deg, #00C9D4, #0088A9)' : '#9CA3AF', cursor: !form.title || !form.body || saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card divide-y divide-gray-50">
        <div className="px-4 py-3">
          <h2 className="font-medium text-gray-800 text-sm">{announcements.length} announcements</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center">
            <div style={{ fontSize: 36, marginBottom: 8 }}>📢</div>
            <p className="text-sm text-gray-500">No announcements yet</p>
          </div>
        ) : announcements.map(a => (
          <div key={a.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-gray-800">{a.title}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  a.type === 'critical' ? 'bg-red-100 text-red-700' :
                  a.type === 'warning'  ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{a.type}</span>
                {!a.is_active && <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Hidden</span>}
              </div>
              <p className="text-xs text-gray-500 mb-1">{a.body}</p>
              <p className="text-[10px] text-gray-400">{new Date(a.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => toggleActive(a.id, a.is_active)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors"
                style={{ borderColor: a.is_active ? '#D1FAE5' : '#E5E7EB', background: a.is_active ? '#D1FAE5' : '#F9FAFB', color: a.is_active ? '#065F46' : '#6B7280' }}>
                {a.is_active ? 'Active' : 'Hidden'}
              </button>
              <button onClick={() => deleteAnn(a.id)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
