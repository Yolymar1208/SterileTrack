'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useHospitalSlug } from '@/lib/hospital'
import {
  Settings, Upload, Check, AlertTriangle,
  ArrowLeft, Building2, Palette, Shield, Trash2
} from 'lucide-react'
import Link from 'next/link'

const ADMIN_ROLES = ['hospital_admin', 'cssd_supervisor', 'system_admin']

const PRESET_COLORS = [
  { name: 'Teal',       value: '#00C9D4' },
  { name: 'Blue',       value: '#2563EB' },
  { name: 'Indigo',     value: '#4F46E5' },
  { name: 'Purple',     value: '#7C3AED' },
  { name: 'Rose',       value: '#E11D48' },
  { name: 'Orange',     value: '#EA580C' },
  { name: 'Amber',      value: '#D97706' },
  { name: 'Green',      value: '#16A34A' },
  { name: 'Emerald',    value: '#059669' },
  { name: 'Cyan',       value: '#0891B2' },
  { name: 'Sky',        value: '#0284C7' },
  { name: 'Slate',      value: '#475569' },
]

type Hospital = {
  id: string
  name: string
  slug: string
  address: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  logo_url: string | null
  accent_color: string | null
  status: string
  plan: { name: string; price_monthly: number } | null
}

export default function SettingsPage() {
  const supabase = createClient()
  const slug     = useHospitalSlug()
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [hospital, setHospital]     = useState<Hospital | null>(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [msg, setMsg]               = useState('')
  const [msgType, setMsgType]       = useState<'success' | 'error'>('success')
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetting, setResetting]   = useState(false)
  const [showReset, setShowReset]   = useState(false)

  const [form, setForm] = useState({
    address:        '',
    contact_person: '',
    contact_email:  '',
    contact_phone:  '',
    accent_color:   '#00C9D4',
  })

  useEffect(() => { load() }, [slug])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, hospital_id')
      .eq('id', user.id)
      .single()

    if (profile && ADMIN_ROLES.includes(profile.role)) {
      setIsAdmin(true)
    }

    const { data: h } = await supabase
      .from('hospitals')
      .select('*, plan:plans(name, price_monthly)')
      .eq('slug', slug)
      .single()

    if (h) {
      setHospital(h)
      setForm({
        address:        h.address || '',
        contact_person: h.contact_person || '',
        contact_email:  h.contact_email || '',
        contact_phone:  h.contact_phone || '',
        accent_color:   h.accent_color || '#00C9D4',
      })
    }
    setLoading(false)
  }

  function showMsg(text: string, type: 'success' | 'error' = 'success') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleSave() {
    if (!hospital) return
    setSaving(true)
    const { error } = await supabase
      .from('hospitals')
      .update({
        address:        form.address || null,
        contact_person: form.contact_person || null,
        contact_email:  form.contact_email || null,
        contact_phone:  form.contact_phone || null,
        accent_color:   form.accent_color,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', hospital.id)

    if (error) showMsg('Error saving: ' + error.message, 'error')
    else { showMsg('Settings saved!'); load() }
    setSaving(false)
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !hospital) return

    if (file.size > 2 * 1024 * 1024) {
      showMsg('Logo must be under 2MB', 'error'); return
    }
    if (!file.type.startsWith('image/')) {
      showMsg('Please upload an image file', 'error'); return
    }

    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `${hospital.slug}/logo.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('hospital-logos')
      .upload(path, file, { upsert: true })

    if (uploadErr) { showMsg('Upload failed: ' + uploadErr.message, 'error'); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage
      .from('hospital-logos')
      .getPublicUrl(path)

    const { error: updateErr } = await supabase
      .from('hospitals')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', hospital.id)

    if (updateErr) showMsg('Error saving logo: ' + updateErr.message, 'error')
    else { showMsg('Logo uploaded!'); load() }
    setUploading(false)
  }

  async function handleRemoveLogo() {
    if (!hospital) return
    await supabase.from('hospitals').update({ logo_url: null }).eq('id', hospital.id)
    showMsg('Logo removed')
    load()
  }

  async function handleReset() {
    if (resetConfirm !== 'RESET' || !hospital) return
    setResetting(true)
    await Promise.all([
      supabase.from('or_verifications').delete().eq('hospital_id', hospital.id),
      supabase.from('inspections').delete().eq('hospital_id', hospital.id),
      supabase.from('dispense_records').delete().eq('hospital_id', hospital.id),
      supabase.from('alerts').delete().eq('hospital_id', hospital.id),
      supabase.from('audit_logs').delete().eq('hospital_id', hospital.id),
      supabase.from('sterilization_loads').delete().eq('hospital_id', hospital.id),
    ])
    await supabase
      .from('inventory_items')
      .update({ status: 'sterile', location: 'Storage', current_remarks: null })
      .eq('hospital_id', hospital.id)
      .eq('item_type', 'instrument_set')

    setResetting(false)
    setShowReset(false)
    setResetConfirm('')
    showMsg('All operational data has been reset.')
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid var(--border, #E5E7EB)', outline: 'none',
    background: 'var(--bg-input, #F9FAFB)', color: 'var(--text-primary, #0D1117)',
  }

  if (loading) return (
    <div className="p-8 text-center text-gray-400">Loading…</div>
  )

  if (!isAdmin) return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="card p-8 text-center">
        <Shield size={32} className="text-gray-300 mx-auto mb-3" />
        <p className="font-medium text-gray-600">Admin access required</p>
        <p className="text-sm text-gray-400 mt-1">Only hospital administrators can access settings.</p>
        <Link href={`/${slug}/dashboard`} className="btn-primary mt-4 justify-center text-sm">
          Back to Dashboard
        </Link>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href={`/${slug}/dashboard`}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Settings size={22} className="text-brand-500" /> Hospital Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">{hospital?.name}</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
          msgType === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {msg}
        </div>
      )}

      {/* Branding */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Palette size={16} className="text-brand-500" /> Branding
        </h2>

        {/* Logo */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-600 mb-2">Hospital Logo</label>
          <div className="flex items-center gap-4">
            <div style={{
              width: 64, height: 64, borderRadius: 12, flexShrink: 0,
              background: hospital?.logo_url ? 'transparent' : 'linear-gradient(135deg, #00C9D4, #0088A9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid #E5E7EB', overflow: 'hidden',
            }}>
              {hospital?.logo_url ? (
                <img src={hospital.logo_url} alt="Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }} />
              ) : (
                <Shield size={28} color="white" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={handleLogoUpload} />
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="btn-secondary text-xs px-3 py-1.5">
                <Upload size={12} />
                {uploading ? 'Uploading…' : 'Upload Logo'}
              </button>
              {hospital?.logo_url && (
                <button onClick={handleRemoveLogo}
                  className="text-xs text-red-500 hover:text-red-700 text-left">
                  Remove logo
                </button>
              )}
              <p className="text-xs text-gray-400">PNG, JPG or SVG · Max 2MB</p>
            </div>
          </div>
        </div>

        {/* Accent color */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Accent Color</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map(c => (
              <button key={c.value} onClick={() => setForm(f => ({ ...f, accent_color: c.value }))}
                title={c.name}
                style={{
                  width: 32, height: 32, borderRadius: 8, background: c.value,
                  border: form.accent_color === c.value ? '3px solid #0D1117' : '2px solid transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'transform 0.1s',
                  transform: form.accent_color === c.value ? 'scale(1.15)' : 'scale(1)',
                }}>
                {form.accent_color === c.value && <Check size={14} color="white" strokeWidth={3} />}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div style={{ width: 18, height: 18, borderRadius: 4, background: form.accent_color, flexShrink: 0 }} />
            Selected: <strong>{PRESET_COLORS.find(c => c.value === form.accent_color)?.name || form.accent_color}</strong>
          </div>
        </div>
      </div>

      {/* Hospital Info */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Building2 size={16} className="text-brand-500" /> Hospital Information
        </h2>

        <div className="space-y-3">
          {/* Hospital name — read only */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Hospital Name <span className="text-gray-400 font-normal">(contact SterileTrack to change)</span>
            </label>
            <input style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
              value={hospital?.name || ''} readOnly />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
            <input style={inputStyle} value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Hospital address" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Contact Person</label>
              <input style={inputStyle} value={form.contact_person}
                onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Contact Phone</label>
              <input style={inputStyle} value={form.contact_phone}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                placeholder="09XX XXX XXXX" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Contact Email</label>
            <input style={inputStyle} type="email" value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              placeholder="hospital@email.com" />
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="card p-5 mb-4">
        <h2 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2">
          <Shield size={16} className="text-brand-500" /> Account
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-gray-400 w-24 flex-shrink-0">Plan</span>
            <span className="font-medium text-gray-700">
              {hospital?.plan?.name || '—'}
              {hospital?.plan?.price_monthly === 0 ? ' (Free)' : ` · ₱${hospital?.plan?.price_monthly?.toLocaleString()}/mo`}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-24 flex-shrink-0">Status</span>
            <span className="font-medium capitalize text-gray-700">{hospital?.status}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 w-24 flex-shrink-0">URL</span>
            <span className="font-mono text-xs text-gray-500">steriletrak.com/{hospital?.slug}</span>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          To change your plan, contact <a href="mailto:yolymarorfiano@yahoo.com"
            className="text-brand-500">yolymarorfiano@yahoo.com</a>
        </p>
      </div>

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className="btn-primary w-full justify-center mb-6"
        style={{ opacity: saving ? 0.7 : 1 }}>
        {saving ? 'Saving…' : <><Check size={15} /> Save Settings</>}
      </button>

      {/* Danger Zone */}
      <div className="card p-5" style={{ border: '1px solid #FCA5A5' }}>
        <h2 className="font-semibold text-red-600 text-sm mb-1 flex items-center gap-2">
          <AlertTriangle size={16} /> Danger Zone
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Reset all operational data — audit logs, dispense records, alerts, inspections. Instrument sets and staff are preserved.
        </p>

        {!showReset ? (
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-2 text-xs font-medium text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 size={13} /> Reset Operational Data
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              This will permanently delete all audit logs, alerts, dispense records, and inspections. This cannot be undone.
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Type <strong className="text-red-600">RESET</strong> to confirm
              </label>
              <input style={inputStyle} value={resetConfirm}
                onChange={e => setResetConfirm(e.target.value)}
                placeholder="Type RESET here…" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowReset(false); setResetConfirm('') }}
                className="btn-secondary text-xs px-3 py-2">Cancel</button>
              <button onClick={handleReset}
                disabled={resetConfirm !== 'RESET' || resetting}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg text-white transition-colors"
                style={{
                  background: resetConfirm === 'RESET' && !resetting ? '#DC2626' : '#9CA3AF',
                  cursor: resetConfirm !== 'RESET' || resetting ? 'not-allowed' : 'pointer',
                }}>
                <Trash2 size={12} />
                {resetting ? 'Resetting…' : 'Reset Data'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
