'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, ArrowLeft, Check, Phone, Mail, Building2, MessageSquare } from 'lucide-react'
import Link from 'next/link'

type Lead = {
  id: string
  name: string
  hospital: string
  phone: string | null
  email: string | null
  message: string | null
  is_read: boolean
  created_at: string
}

export default function LeadsPage() {
  const supabase = createClient()
  const [leads, setLeads]   = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all' | 'unread'>('unread')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('contact_leads')
      .select('*')
      .order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await supabase.from('contact_leads').update({ is_read: true }).eq('id', id)
    setLeads(l => l.map(x => x.id === id ? { ...x, is_read: true } : x))
  }

  async function markAllRead() {
    await supabase.from('contact_leads').update({ is_read: true }).eq('is_read', false)
    setLeads(l => l.map(x => ({ ...x, is_read: true })))
  }

  const filtered   = filter === 'unread' ? leads.filter(l => !l.is_read) : leads
  const unreadCount = leads.filter(l => !l.is_read).length

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Overview
      </Link>

      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={22} className="text-brand-500" /> Contact Leads
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All messages read'}
          </p>
        </div>
        <div className="flex gap-2">
          {['unread', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border capitalize transition-colors"
              style={{
                background: filter === f ? '#0A0F1E' : '#fff',
                color: filter === f ? '#fff' : '#6B7280',
                borderColor: filter === f ? '#0A0F1E' : '#E5E7EB',
              }}>
              {f} {f === 'unread' && unreadCount > 0 && `(${unreadCount})`}
            </button>
          ))}
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="card divide-y divide-gray-50">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <div style={{ fontSize: 36, marginBottom: 8 }}>📬</div>
            <p className="text-sm text-gray-500">
              {filter === 'unread' ? 'No unread messages' : 'No messages yet'}
            </p>
          </div>
        ) : filtered.map(lead => (
          <div key={lead.id} style={{ background: lead.is_read ? '#fff' : '#F0FDFA' }}
            className="px-4 py-4">
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: lead.is_read ? '#F3F4F6' : 'linear-gradient(135deg, #00C9D4, #0088A9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700,
                color: lead.is_read ? '#6B7280' : '#fff',
              }}>
                {lead.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name + date */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{lead.name}</span>
                    {!lead.is_read && (
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00C9D4', flexShrink: 0, display: 'inline-block' }} />
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(lead.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })} · {new Date(lead.created_at).toLocaleTimeString('en-PH', { timeStyle: 'short' })}
                  </span>
                </div>

                {/* Hospital */}
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-600">
                  <Building2 size={11} className="text-gray-400" />
                  {lead.hospital}
                </div>

                {/* Contact info */}
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`}
                      className="flex items-center gap-1 text-xs text-brand-500 font-medium hover:underline">
                      <Phone size={11} /> {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`}
                      className="flex items-center gap-1 text-xs text-brand-500 font-medium hover:underline">
                      <Mail size={11} /> {lead.email}
                    </a>
                  )}
                </div>

                {/* Message */}
                {lead.message && (
                  <div className="mt-2 flex items-start gap-1.5">
                    <MessageSquare size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 leading-relaxed">{lead.message}</p>
                  </div>
                )}
              </div>

              {/* Mark read */}
              {!lead.is_read && (
                <button onClick={() => markRead(lead.id)}
                  title="Mark as read"
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <Check size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
