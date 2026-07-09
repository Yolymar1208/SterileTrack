'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Megaphone, X } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  body: string
  type: string
}

const TYPE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  info:     { bg: '#EFF6FF', border: '#BFDBFE', color: '#1D4ED8' },
  warning:  { bg: '#FEF3C7', border: '#FDE68A', color: '#D97706' },
  critical: { bg: '#FEE2E2', border: '#FCA5A5', color: '#DC2626' },
}

export default function AnnouncementBanner() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed]         = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('announcements')
      .select('id, title, body, type')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setAnnouncements(data || []))
  }, [])

  const visible = announcements.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 16px 8px' }}>
      {visible.map(a => {
        const s = TYPE_STYLE[a.type] || TYPE_STYLE.info
        return (
          <div key={a.id} style={{
            background: s.bg, border: `1px solid ${s.border}`,
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <Megaphone size={15} style={{ color: s.color, flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0F1E' }}>{a.title} </span>
              <span style={{ fontSize: 12, color: '#6B7280' }}>{a.body}</span>
            </div>
            <button onClick={() => setDismissed(d => new Set([...d, a.id]))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
