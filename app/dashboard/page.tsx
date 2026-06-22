'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  Inbox, Send, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, RefreshCw, Bell, ListChecks, Archive,
  Package, Download, Upload, Loader2, X, Eye, EyeOff,
  Lock, ClipboardCheck
} from 'lucide-react'
import { AuditLog, ACTION_LABELS } from '@/lib/types'

interface Stats {
  sterile_count: number; dispensed_count: number; received_count: number
  packed_count: number; in_or_count: number; missing_count: number
  damaged_count: number; expiring_soon_count: number; active_alerts_count: number
}

function getTimeEmoji(h: number) {
  if (h >= 5  && h < 9)  return '🌤️'
  if (h >= 9  && h < 13) return '☀️'
  if (h >= 13 && h < 17) return '🌞'
  if (h >= 17 && h < 20) return '🌇'
  if (h >= 20 && h < 22) return '🌃'
  return '🌙'
}
function getGreeting(h: number) {
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 22) return 'Good evening'
  return 'Good night'
}

const BACKUP_PASSWORD = 'Terminus8'
const BACKUP_TABLES = ['inventory_items','audit_logs','dispense_records','inspections','or_verifications','set_contents','alerts','profiles']

export default function DashboardPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats]               = useState<Stats | null>(null)
  const [recentAudit, setRecentAudit]   = useState<AuditLog[]>([])
  const [greeting, setGreeting]         = useState('')
  const [emoji, setEmoji]               = useState('☀️')
  const [userName, setUserName]         = useState('there')
  const [loading, setLoading]           = useState(true)
  const [orPendingCount, setOrPendingCount] = useState(0)
  const [backingUp, setBackingUp]       = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadPassword, setUploadPassword]   = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [pwError, setPwError]           = useState('')
  const [uploading, setUploading]       = useState(false)
  const [uploadMsg, setUploadMsg]       = useState('')
  const [uploadFile, setUploadFile]     = useState<File | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(getGreeting(h)); setEmoji(getTimeEmoji(h))
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      setUserName(p?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'there')

      // OR pending
      const { data: myD } = await supabase.from('dispense_records').select('id, item_id').eq('received_by_id', user.id)
      if (myD && myD.length > 0) {
        const ids = myD.map(d => d.item_id)
        const { data: still } = await supabase.from('inventory_items').select('id').eq('status','dispensed').in('id', ids)
        if (still && still.length > 0) {
          const dids = myD.filter(d => still.some((s:any) => s.id === d.item_id)).map(d => d.id)
          const { data: v } = await supabase.from('or_verifications').select('dispense_record_id').in('dispense_record_id', dids)
          const vids = new Set((v||[]).map((x:any) => x.dispense_record_id))
          setOrPendingCount(dids.filter(id => !vids.has(id)).length)
        } else setOrPendingCount(0)
      } else setOrPendingCount(0)
    }

    const { data: s } = await supabase.from('dashboard_stats').select('*').single()
    if (s) setStats(s)
    const { data: a } = await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(6)
    setRecentAudit(a || [])
    setLoading(false)
  }

  async function handleBackup() {
    setBackingUp(true)
    const backup: Record<string, any> = { _meta: { created_at: new Date().toISOString(), version: '1.0', app: 'SterileTrack' } }
    for (const t of BACKUP_TABLES) { const { data } = await supabase.from(t).select('*'); backup[t] = data || [] }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `steriletrack-backup-${format(new Date(),'yyyy-MM-dd-HHmm')}.json`
    a.click(); URL.revokeObjectURL(a.href)
    setBackingUp(false)
  }

  function handlePasswordSubmit() {
    if (uploadPassword !== BACKUP_PASSWORD) { setPwError('Incorrect password.'); return }
    setPwError(''); fileInputRef.current?.click()
  }

  async function handleRestore() {
    if (!uploadFile) return
    setUploading(true); setUploadMsg('')
    try {
      const data = JSON.parse(await uploadFile.text())
      if (!data._meta || data._meta.app !== 'SterileTrack') { setUploadMsg('❌ Invalid backup file.'); setUploading(false); return }
      let restored = 0
      const ORDER = ['profiles','inventory_items','set_contents','dispense_records','inspections','or_verifications','audit_logs','alerts']
      for (const t of ORDER) {
        if (!data[t]?.length) continue
        const { error } = await supabase.from(t).upsert(data[t], { onConflict: 'id', ignoreDuplicates: true })
        if (!error) restored += data[t].length
      }
      setUploadMsg(`✅ Restore complete! ${restored} records.`)
      setUploading(false)
      setTimeout(() => { setShowUploadModal(false); setUploadFile(null); setUploadPassword(''); loadAll() }, 2000)
    } catch { setUploadMsg('❌ Failed to read file.'); setUploading(false) }
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>

      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: '#0D1117', letterSpacing: '-0.4px' }}>
            {greeting}, {userName} {emoji}
          </h1>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAll} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleBackup} disabled={backingUp} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>
            {backingUp ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            <span className="hidden sm:inline">Back-up</span>
          </button>
          <button onClick={() => setShowUploadModal(true)} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>
            <Upload size={13} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {stats && (stats.missing_count > 0 || stats.active_alerts_count > 0) && (
        <Link href="/alerts">
          <div style={{
            background: '#FEF2F2', border: '0.5px solid #FCA5A5',
            borderRadius: 10, padding: '10px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer'
          }}>
            <Bell size={15} style={{ color: '#EF4444', flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: '#B91C1C', fontWeight: 500, flex: 1 }}>
              {stats.missing_count > 0 && `${stats.missing_count} missing item${stats.missing_count > 1 ? 's' : ''}`}
              {stats.missing_count > 0 && stats.active_alerts_count > 0 && ' · '}
              {stats.active_alerts_count > 0 && `${stats.active_alerts_count} unresolved alert${stats.active_alerts_count > 1 ? 's' : ''}`}
            </p>
            <ArrowRight size={13} style={{ color: '#EF4444' }} />
          </div>
        </Link>
      )}

      {/* Three workflow cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {/* Dispensing */}
        <Link href="/dispensing">
          <div className="card" style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#00C9D4'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(0,201,212,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#EAECF0'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Send size={18} style={{ color: '#16A34A' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0D1117', marginBottom: 2 }}>Dispensing Area</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>Release sterile sets to OR</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 500, color: '#16A34A', letterSpacing: '-0.5px' }}>{stats?.sterile_count ?? '–'}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>ready · <span style={{ color: '#2563EB' }}>{stats?.dispensed_count ?? '–'}</span> at OR</span>
            </div>
          </div>
        </Link>

        {/* OR Verification */}
        <Link href="/or-verification">
          <div className="card" style={{
            padding: 18, cursor: 'pointer', transition: 'all 0.15s',
            borderColor: orPendingCount > 0 ? '#FCA5A5' : '#EAECF0',
            background: orPendingCount > 0 ? '#FFF5F5' : '#fff'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: orPendingCount > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(0,201,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardCheck size={18} style={{ color: orPendingCount > 0 ? '#EF4444' : '#00C9D4' }} />
              </div>
              {orPendingCount > 0 && (
                <span style={{ width: 20, height: 20, background: '#E83A3A', color: '#fff', fontSize: 11, fontWeight: 600, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>!</span>
              )}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0D1117', marginBottom: 2 }}>OR Verification</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>Confirm set completeness</div>
            {orPendingCount > 0 ? (
              <div style={{ fontSize: 11, color: '#EF4444', fontWeight: 500 }}>{orPendingCount} pending your verification</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16A34A', fontWeight: 500 }}>
                <CheckCircle2 size={12} /> All clear
              </div>
            )}
          </div>
        </Link>

        {/* Receiving */}
        <Link href="/receiving">
          <div className="card" style={{ padding: 18, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#00C9D4'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(0,201,212,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#EAECF0'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(0,201,212,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Inbox size={18} style={{ color: '#00A9B8' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0D1117', marginBottom: 2 }}>Receiving Area</div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 12 }}>Inspect · Pack · Sterilize</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 26, fontWeight: 500, color: '#D97706', letterSpacing: '-0.5px' }}>{stats?.received_count ?? '–'}</span>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>awaiting · <span style={{ color: '#EA580C' }}>{stats?.packed_count ?? '–'}</span> sterilizing</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Sterile Ready', val: stats?.sterile_count, sub: null, valColor: '#0D1117', href: '/storage', icon: CheckCircle2, iconColor: '#16A34A', iconBg: 'rgba(22,163,74,0.08)' },
          { label: 'At OR',         val: stats?.dispensed_count, sub: null, valColor: '#0D1117', href: null,     icon: Package,       iconColor: '#2563EB', iconBg: 'rgba(37,99,235,0.08)' },
          { label: 'Missing',       val: stats?.missing_count,  sub: 'Needs attention', valColor: '#EF4444', href: '/alerts', icon: AlertTriangle, iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.08)' },
          { label: 'Expiring Soon', val: stats?.expiring_soon_count, sub: 'within 7 days', valColor: '#D97706', href: null, icon: Clock, iconColor: '#D97706', iconBg: 'rgba(217,119,6,0.08)' },
        ].map(c => {
          const inner = (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <c.icon size={15} style={{ color: c.iconColor }} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', color: c.valColor, lineHeight: 1 }}>
                {loading ? '–' : c.val ?? 0}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{c.label}</div>
              {c.sub && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{c.sub}</div>}
            </div>
          )
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>
        })}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { href: '/sets',      icon: ListChecks, label: 'Instrument Sets', color: '#00A9B8' },
          { href: '/storage',   icon: Archive,    label: 'Storage Shelf',   color: '#0F766E' },
          { href: '/inventory', icon: Package,    label: 'All Inventory',   color: '#6B7280' },
        ].map(q => (
          <Link key={q.href} href={q.href}>
            <div className="card" style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'border-color 0.12s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#00C9D4'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#EAECF0'}>
              <q.icon size={16} style={{ color: q.color }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{q.label}</span>
              <ArrowRight size={12} style={{ color: '#D1D5DB', marginLeft: 'auto' }} />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#0D1117', letterSpacing: '-0.1px' }}>Recent Activity</span>
        <Link href="/audit"><span style={{ fontSize: 12, color: '#00C9D4', cursor: 'pointer' }}>Full audit trail →</span></Link>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
        ) : recentAudit.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No activity yet</div>
        ) : recentAudit.map((log, i) => (
          <div key={log.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
            borderBottom: i < recentAudit.length - 1 ? '0.5px solid #F3F4F6' : 'none'
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C9D4', marginTop: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: '#0D1117' }}>{log.item_name}</span>
                <span style={{ color: '#D1D5DB', margin: '0 6px' }}>·</span>
                <span style={{ color: '#00A9B8', fontSize: 12 }}>
                  {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                By {log.performed_by_name}{log.location && ` · ${log.location}`}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', flexShrink: 0 }}>
              {format(new Date(log.created_at), 'h:mm a')}
            </div>
          </div>
        ))}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".json"
        onChange={e => setUploadFile(e.target.files?.[0] || null)} className="hidden" />

      {/* Upload modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 360, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '0.5px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#0D1117' }}>Upload Backup</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>Password required</div>
              </div>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!uploadFile ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFBEB', border: '0.5px solid #FCD34D', borderRadius: 8, padding: '10px 12px' }}>
                    <Lock size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: '#92400E' }}>Enter the upload password</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPw ? 'text' : 'password'} value={uploadPassword}
                        onChange={e => { setUploadPassword(e.target.value); setPwError('') }}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                        placeholder="Enter password…" className="input-field" style={{ paddingRight: 40 }} autoFocus />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwError && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{pwError}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowUploadModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>Cancel</button>
                    <button onClick={handlePasswordSubmit} disabled={!uploadPassword} className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>Continue →</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ background: '#F0FDF4', border: '0.5px solid #86EFAC', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                    <CheckCircle2 size={20} style={{ color: '#16A34A', margin: '0 auto 6px' }} />
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#15803D' }}>File selected</p>
                    <p style={{ fontSize: 11, color: '#166534', fontFamily: 'monospace', marginTop: 2 }}>{uploadFile.name}</p>
                  </div>
                  {uploadMsg && <p style={{ fontSize: 13, fontWeight: 500, textAlign: 'center', color: uploadMsg.startsWith('✅') ? '#16A34A' : '#EF4444' }}>{uploadMsg}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setUploadFile(null)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}>← Back</button>
                    <button onClick={handleRestore} disabled={uploading} className="btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13, background: '#16A34A' }}>
                      {uploading ? <><Loader2 size={13} className="animate-spin" /> Restoring…</> : '✓ Restore'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
