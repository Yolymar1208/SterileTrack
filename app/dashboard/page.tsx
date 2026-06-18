'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  Inbox, Send, Package, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, RefreshCw, Bell, ListChecks, Archive,
  Download, Upload, Loader2, X, Eye, EyeOff, Lock, ClipboardCheck
} from 'lucide-react'
import { InventoryItem, AuditLog, STATUS_CONFIG, ACTION_LABELS } from '@/lib/types'

interface Stats {
  sterile_count: number
  dispensed_count: number
  received_count: number
  packed_count: number
  in_or_count: number
  missing_count: number
  damaged_count: number
  expiring_soon_count: number
  active_alerts_count: number
}

// Time-based greeting emoji
function getTimeEmoji(hour: number): string {
  if (hour >= 5 && hour < 9)  return '🌤️'   // Early morning — sun with clouds
  if (hour >= 9 && hour < 13) return '☀️'    // Morning/midday — full sun
  if (hour >= 13 && hour < 17) return '🌞'   // Afternoon — sun with face
  if (hour >= 17 && hour < 20) return '🌇'   // Dusk — reddish sun
  if (hour >= 20 && hour < 22) return '🌃'   // Night falling — stars
  return '🌙'                                 // Night — crescent moon (10pm–5am)
}

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12)  return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return 'Good night'
}

const BACKUP_PASSWORD = 'Terminus8'
const BACKUP_TABLES = [
  'inventory_items', 'audit_logs', 'dispense_records',
  'inspections', 'or_verifications', 'set_contents', 'alerts', 'profiles'
]

export default function DashboardPage() {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<Stats | null>(null)
  const [recentItems, setRecentItems] = useState<InventoryItem[]>([])
  const [recentAudit, setRecentAudit] = useState<AuditLog[]>([])
  const [greeting, setGreeting] = useState('')
  const [emoji, setEmoji] = useState('☀️')
  const [userName, setUserName] = useState('there')
  const [loading, setLoading] = useState(true)
  const [orPendingCount, setOrPendingCount] = useState(0)

  // Backup state
  const [backingUp, setBackingUp] = useState(false)

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadPassword, setUploadPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(getGreeting(h))
    setEmoji(getTimeEmoji(h))
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      if (profile) setUserName(profile.full_name.split(' ')[0])
      else setUserName(user.email?.split('@')[0] || 'there')
    }
    const { data: statsData } = await supabase.from('dashboard_stats').select('*').single()
    if (statsData) setStats(statsData)
    const { data: items } = await supabase.from('inventory_items').select('*').order('updated_at', { ascending: false }).limit(5)
    setRecentItems(items || [])
    const { data: audit } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(6)
    setRecentAudit(audit || [])

    // OR pending count for current user
    if (user) {
      const { data: myDispenses } = await supabase
        .from('dispense_records').select('id, item_id').eq('received_by_id', user.id)
      if (myDispenses && myDispenses.length > 0) {
        const itemIds = myDispenses.map(d => d.item_id)
        const { data: stillDispensed } = await supabase
          .from('inventory_items').select('id').eq('status', 'dispensed').in('id', itemIds)
        if (stillDispensed && stillDispensed.length > 0) {
          const dispIds = myDispenses
            .filter(d => stillDispensed.some(s => s.id === d.item_id)).map(d => d.id)
          const { data: verified } = await supabase
            .from('or_verifications').select('dispense_record_id').in('dispense_record_id', dispIds)
          const verifiedIds = new Set((verified || []).map((v: any) => v.dispense_record_id))
          setOrPendingCount(dispIds.filter(id => !verifiedIds.has(id)).length)
        } else { setOrPendingCount(0) }
      } else { setOrPendingCount(0) }
    }

    setLoading(false)
  }

  // ── BACKUP ──────────────────────────────────────────────────────────────────
  async function handleBackup() {
    setBackingUp(true)
    const backup: Record<string, any[]> = {
      _meta: { created_at: new Date().toISOString(), version: '1.0', app: 'SterileTrack' } as any
    }

    for (const table of BACKUP_TABLES) {
      const { data } = await supabase.from(table).select('*')
      backup[table] = data || []
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `steriletrack-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackingUp(false)
  }

  // ── UPLOAD / RESTORE ────────────────────────────────────────────────────────
  function handleUploadClick() {
    setShowUploadModal(true)
    setUploadPassword('')
    setPwError('')
    setUploadMsg('')
    setUploadFile(null)
  }

  function handlePasswordSubmit() {
    if (uploadPassword !== BACKUP_PASSWORD) {
      setPwError('Incorrect password. Access denied.')
      return
    }
    setPwError('')
    // Open file picker
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadMsg('')
  }

  async function handleRestore() {
    if (!uploadFile) return
    setUploading(true)
    setUploadMsg('')

    try {
      const text = await uploadFile.text()
      const data = JSON.parse(text)

      if (!data._meta || data._meta.app !== 'SterileTrack') {
        setUploadMsg('❌ Invalid backup file. Please use a SterileTrack backup.')
        setUploading(false)
        return
      }

      let restored = 0

      // Restore tables in dependency order (profiles first, then items, then logs)
      const ORDER = ['profiles', 'inventory_items', 'set_contents', 'dispense_records', 'inspections', 'or_verifications', 'audit_logs', 'alerts']

      for (const table of ORDER) {
        if (!data[table] || data[table].length === 0) continue
        // Upsert — inserts new rows, updates existing ones by primary key
        const { error } = await supabase.from(table).upsert(data[table], { onConflict: 'id', ignoreDuplicates: true })
        if (!error) restored += data[table].length
      }

      setUploadMsg(`✅ Restore complete! ${restored} records processed.`)
      setUploading(false)
      setTimeout(() => {
        setShowUploadModal(false)
        setUploadFile(null)
        setUploadPassword('')
        loadAll()
      }, 2000)
    } catch (err) {
      setUploadMsg('❌ Failed to read file. Make sure it is a valid SterileTrack backup.')
      setUploading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            {greeting}, {userName} {emoji}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={loadAll} className="btn-secondary text-sm px-3 py-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button onClick={handleBackup} disabled={backingUp}
            className="btn-secondary text-sm px-3 py-2" title="Back-up all data">
            {backingUp ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span className="hidden sm:inline">Back-up</span>
          </button>
          <button onClick={handleUploadClick}
            className="btn-secondary text-sm px-3 py-2" title="Upload / Restore backup">
            <Upload size={14} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        </div>
      </div>

      {/* Alert banner */}
      {stats && (stats.missing_count > 0 || stats.active_alerts_count > 0) && (
        <Link href="/alerts">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3 hover:bg-red-100 transition-colors">
            <Bell size={16} className="text-red-500" />
            <p className="text-sm text-red-700 font-medium">
              {stats.missing_count > 0 && `${stats.missing_count} missing item${stats.missing_count > 1 ? 's' : ''}`}
              {stats.missing_count > 0 && stats.active_alerts_count > 0 && ' · '}
              {stats.active_alerts_count > 0 && `${stats.active_alerts_count} unresolved alert${stats.active_alerts_count > 1 ? 's' : ''}`}
            </p>
            <ArrowRight size={14} className="text-red-400 ml-auto" />
          </div>
        </Link>
      )}

      {/* Three workflow cards */}
      <div className="grid md:grid-cols-3 gap-3 mb-5">
        {/* 1. Dispensing */}
        <Link href="/dispensing">
          <div className="card p-5 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-brand-300 h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center">
                <Send size={22} className="text-green-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 text-sm">Dispensing Area</h2>
                <p className="text-xs text-gray-500">Release sterile sets to OR</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                <span className="text-green-600 font-semibold text-base">{stats?.sterile_count ?? '–'}</span>
                <span className="ml-1">ready</span>
                <span className="mx-1">·</span>
                <span className="text-blue-600 font-semibold">{stats?.dispensed_count ?? '–'}</span>
                <span className="ml-1">at OR</span>
              </div>
              <ArrowRight size={14} className="text-green-500" />
            </div>
          </div>
        </Link>

        {/* 2. OR Verification */}
        <Link href="/or-verification">
          <div className={`card p-5 hover:shadow-md transition-all cursor-pointer border-2 h-full ${
            orPendingCount > 0 ? 'border-red-200 bg-red-50' : 'border-transparent hover:border-brand-300'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                orPendingCount > 0 ? 'bg-red-100' : 'bg-brand-50'
              }`}>
                <ClipboardCheck size={22} className={orPendingCount > 0 ? 'text-red-600' : 'text-brand-500'} />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                  OR Verification
                  {orPendingCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">!</span>
                  )}
                </h2>
                <p className="text-xs text-gray-500">Confirm set completeness</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              {orPendingCount > 0 ? (
                <p className="text-xs text-red-600 font-medium">{orPendingCount} pending your verification</p>
              ) : (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 size={11} /> All clear
                </p>
              )}
              <ArrowRight size={14} className={orPendingCount > 0 ? 'text-red-400' : 'text-brand-500'} />
            </div>
          </div>
        </Link>

        {/* 3. Receiving */}
        <Link href="/receiving">
          <div className="card p-5 hover:shadow-md transition-all cursor-pointer border-2 border-transparent hover:border-brand-300 h-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center">
                <Inbox size={22} className="text-brand-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800 text-sm">Receiving Area</h2>
                <p className="text-xs text-gray-500">Inspect · Pack · Sterilize</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                <span className="text-amber-600 font-semibold">{stats?.received_count ?? '–'}</span>
                <span className="ml-1">awaiting</span>
                <span className="mx-1">·</span>
                <span className="text-orange-600 font-semibold">{stats?.packed_count ?? '–'}</span>
                <span className="ml-1">sterilizing</span>
              </div>
              <ArrowRight size={16} className="text-brand-500" />
            </div>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Sterile Ready" value={stats?.sterile_count} icon={CheckCircle2} color="text-green-600 bg-green-50" href="/storage" />
        <StatCard label="At OR" value={stats?.dispensed_count} icon={Package} color="text-blue-600 bg-blue-50" />
        <StatCard label="Missing" value={stats?.missing_count} icon={AlertTriangle} color="text-red-600 bg-red-50" href="/alerts" />
        <StatCard label="Expiring Soon" value={stats?.expiring_soon_count} icon={Clock} color="text-amber-600 bg-amber-50" sub="within 7 days" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Link href="/sets" className="card p-3 hover:shadow-sm transition-all text-center">
          <ListChecks size={18} className="text-brand-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">Manage Sets</div>
        </Link>
        <Link href="/storage" className="card p-3 hover:shadow-sm transition-all text-center">
          <Archive size={18} className="text-teal-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">Storage Shelf</div>
        </Link>
        <Link href="/inventory" className="card p-3 hover:shadow-sm transition-all text-center">
          <Package size={18} className="text-gray-500 mx-auto mb-1" />
          <div className="text-xs font-medium text-gray-700">All Inventory</div>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-gray-800 text-sm">Recent Activity</h2>
          <Link href="/audit" className="text-brand-500 text-xs font-medium">Full audit trail</Link>
        </div>
        {loading ? (
          <div className="text-sm text-gray-400 text-center py-4">Loading…</div>
        ) : recentAudit.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">No activity yet</div>
        ) : (
          <div className="space-y-2">
            {recentAudit.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">{log.item_name}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-brand-600 font-medium">
                      {ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    By {log.performed_by_name}
                    {log.location && ` · ${log.location}`}
                    {' · '}{format(new Date(log.created_at), 'h:mm a')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input for restore */}
      <input ref={fileInputRef} type="file" accept=".json"
        onChange={handleFileSelected} className="hidden" />

      {/* Upload / Restore Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Upload Backup Data</h2>
                <p className="text-xs text-gray-500 mt-0.5">Restricted access — password required</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!uploadFile ? (
                <>
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <Lock size={15} className="text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-700">Enter the upload password to continue</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={uploadPassword}
                        onChange={e => { setUploadPassword(e.target.value); setPwError('') }}
                        onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                        placeholder="Enter password…"
                        className="input-field pr-10"
                        autoFocus
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {pwError && <p className="text-xs text-red-600 mt-1">{pwError}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowUploadModal(false)} className="btn-secondary flex-1 justify-center text-sm">
                      Cancel
                    </button>
                    <button onClick={handlePasswordSubmit} disabled={!uploadPassword}
                      className="btn-primary flex-1 justify-center text-sm">
                      Continue →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-3 text-center">
                    <CheckCircle2 size={20} className="text-green-500 mx-auto mb-1" />
                    <p className="text-sm font-medium text-green-800">File selected</p>
                    <p className="text-xs text-green-600 mt-0.5 font-mono truncate">{uploadFile.name}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-amber-700">
                      ⚠ This will restore data from the backup file. Existing records with matching IDs will be skipped.
                    </p>
                  </div>
                  {uploadMsg && (
                    <p className={`text-sm font-medium text-center ${uploadMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                      {uploadMsg}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setUploadFile(null)} className="btn-secondary flex-1 justify-center text-sm">
                      ← Back
                    </button>
                    <button onClick={handleRestore} disabled={uploading}
                      className="btn-primary flex-1 justify-center text-sm bg-green-600 hover:bg-green-700">
                      {uploading ? <><Loader2 size={14} className="animate-spin" /> Restoring…</> : '✓ Restore Data'}
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

function StatCard({ label, value, color, sub, icon: Icon, href }: any) {
  const inner = (
    <div className={`card p-4 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-semibold text-gray-800">{value ?? '–'}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
