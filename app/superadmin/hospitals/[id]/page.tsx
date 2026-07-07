'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Users, Package, History,
  AlertTriangle, CheckCircle, XCircle, Clock,
  Edit2, Save, X, ExternalLink
} from 'lucide-react'

type Plan = { id: string; name: string; price_monthly: number }
type Hospital = {
  id: string; name: string; slug: string; status: string
  address: string | null; contact_person: string | null
  contact_email: string | null; contact_phone: string | null
  trial_ends_at: string | null; activated_at: string | null
  notes: string | null; created_at: string
  plan: Plan | null
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#276749', bg: '#C6F6D5' },
  trial:     { label: 'Trial',     color: '#975A16', bg: '#FEFCBF' },
  inactive:  { label: 'Inactive',  color: '#9B2C2C', bg: '#FED7D7' },
  suspended: { label: 'Suspended', color: '#744210', bg: '#FEEBC8' },
}

export default function HospitalDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const supabase = createClient()

  const [hospital, setHospital]     = useState<Hospital | null>(null)
  const [plans, setPlans]           = useState<Plan[]>([])
  const [stats, setStats]           = useState({ staff: 0, sets: 0, alerts: 0, logs: 0 })
  const [loading, setLoading]       = useState(true)
  const [editing, setEditing]       = useState(false)
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const [editForm, setEditForm]     = useState<Partial<Hospital & { plan_id: string }>>({})

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: h }, { data: pl }] = await Promise.all([
      supabase.from('hospitals').select('*, plan:plans(id, name, price_monthly)').eq('id', id).single(),
      supabase.from('plans').select('id, name, price_monthly').order('price_monthly'),
    ])

    if (h) {
      setHospital(h)
      setEditForm({ ...h, plan_id: h.plan?.id || '' })
    }
    setPlans(pl || [])

    // Load stats
    const [
      { count: staff },
      { count: sets },
      { count: alerts },
      { count: logs },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('hospital_id', id),
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('hospital_id', id),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('hospital_id', id).eq('is_resolved', false),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('hospital_id', id),
    ])
    setStats({ staff: staff || 0, sets: sets || 0, alerts: alerts || 0, logs: logs || 0 })
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('hospitals').update({
      name:           editForm.name,
      address:        editForm.address || null,
      contact_person: editForm.contact_person || null,
      contact_email:  editForm.contact_email || null,
      contact_phone:  editForm.contact_phone || null,
      plan_id:        editForm.plan_id || null,
      notes:          editForm.notes || null,
      updated_at:     new Date().toISOString(),
    }).eq('id', id as string)

    if (error) { setMsg('Error: ' + error.message) }
    else { setMsg('Saved!'); setEditing(false); load() }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleStatusChange(newStatus: string) {
    const update: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }
    if (newStatus === 'active' && !hospital?.activated_at) {
      update.activated_at = new Date().toISOString()
    }
    if (newStatus === 'trial') {
      update.trial_ends_at = new Date(Date.now() + 14 * 86400000).toISOString()
    }

    const { error } = await supabase.from('hospitals').update(update).eq('id', id as string)
    if (error) { setMsg('Error: ' + error.message) }
    else { setMsg(`Status changed to ${newStatus}`); load() }
    setTimeout(() => setMsg(''), 3000)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>
  if (!hospital) return <div className="p-8 text-center text-gray-400">Hospital not found</div>

  const s = STATUS_STYLE[hospital.status] || STATUS_STYLE.inactive
  const daysLeft = hospital.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(hospital.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid #E5E7EB', outline: 'none', background: '#fff', color: '#111827',
  }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 } as React.CSSProperties

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Overview
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #E0FAFB, #B3F2F5)' }}>
            <Building2 size={22} style={{ color: '#00B8C2' }} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{hospital.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-gray-400">/{hospital.slug}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ color: s.color, background: s.bg }}>{s.label}</span>
              {hospital.status === 'trial' && daysLeft !== null && (
                <span className="text-xs" style={{ color: '#D69E2E' }}>{daysLeft}d left</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a href={`https://steriletrak.com/${hospital.slug}/dashboard`} target="_blank"
            className="flex items-center gap-1.5 text-xs text-brand-500 font-medium px-3 py-2 rounded-lg hover:bg-brand-50">
            <ExternalLink size={13} /> Open App
          </a>
          <button onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            {editing ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded-xl text-sm"
          style={{
            background: msg.startsWith('Error') ? '#FEE2E2' : '#C6F6D5',
            color: msg.startsWith('Error') ? '#B91C1C' : '#276749',
          }}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Staff',      value: stats.staff,  icon: Users,         color: '#00C9D4' },
          { label: 'Sets',       value: stats.sets,   icon: Package,       color: '#38A169' },
          { label: 'Alerts',     value: stats.alerts, icon: AlertTriangle, color: '#E53E3E' },
          { label: 'Audit Logs', value: stats.logs,   icon: History,       color: '#805AD5' },
        ].map(tile => (
          <div key={tile.label} className="card p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">{tile.label}</span>
              <tile.icon size={14} style={{ color: tile.color }} />
            </div>
            <div className="text-xl font-semibold text-gray-800">{tile.value}</div>
          </div>
        ))}
      </div>

      {/* Status Actions */}
      <div className="card p-4 mb-4">
        <h2 className="font-medium text-gray-800 text-sm mb-3">Account Status</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleStatusChange('active')} disabled={hospital.status === 'active'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{
              background: hospital.status === 'active' ? '#C6F6D5' : '#fff',
              color: hospital.status === 'active' ? '#276749' : '#374151',
              borderColor: hospital.status === 'active' ? '#9AE6B4' : '#E5E7EB',
              cursor: hospital.status === 'active' ? 'default' : 'pointer',
            }}>
            <CheckCircle size={13} /> Activate
          </button>
          <button onClick={() => handleStatusChange('trial')} disabled={hospital.status === 'trial'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{
              background: hospital.status === 'trial' ? '#FEFCBF' : '#fff',
              color: hospital.status === 'trial' ? '#975A16' : '#374151',
              borderColor: hospital.status === 'trial' ? '#F6E05E' : '#E5E7EB',
              cursor: hospital.status === 'trial' ? 'default' : 'pointer',
            }}>
            <Clock size={13} /> Set Trial (+14 days)
          </button>
          <button onClick={() => handleStatusChange('inactive')} disabled={hospital.status === 'inactive'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
            style={{
              background: hospital.status === 'inactive' ? '#FED7D7' : '#fff',
              color: hospital.status === 'inactive' ? '#9B2C2C' : '#374151',
              borderColor: hospital.status === 'inactive' ? '#FEB2B2' : '#E5E7EB',
              cursor: hospital.status === 'inactive' ? 'default' : 'pointer',
            }}>
            <XCircle size={13} /> Deactivate
          </button>
        </div>
        {hospital.activated_at && (
          <p className="text-xs text-gray-400 mt-2">
            Activated: {new Date(hospital.activated_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
          </p>
        )}
      </div>

      {/* Details / Edit Form */}
      <div className="card p-5 mb-4">
        <h2 className="font-medium text-gray-800 text-sm mb-4">Hospital Details</h2>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label style={labelStyle}>Hospital Name</label>
              <input style={inputStyle} value={editForm.name || ''}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle} value={editForm.address || ''}
                onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>Contact Person</label>
                <input style={inputStyle} value={editForm.contact_person || ''}
                  onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Contact Phone</label>
                <input style={inputStyle} value={editForm.contact_phone || ''}
                  onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input style={inputStyle} type="email" value={editForm.contact_email || ''}
                onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Plan</label>
              <select style={inputStyle} value={editForm.plan_id || ''}
                onChange={e => setEditForm(f => ({ ...f, plan_id: e.target.value }))}>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.price_monthly > 0 ? `— ₱${p.price_monthly.toLocaleString()}/mo` : '— Free'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Internal Notes</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
                value={editForm.notes || ''}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #00C9D4, #0088A9)', cursor: saving ? 'not-allowed' : 'pointer' }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {[
              { label: 'Address',        value: hospital.address },
              { label: 'Contact Person', value: hospital.contact_person },
              { label: 'Contact Phone',  value: hospital.contact_phone },
              { label: 'Contact Email',  value: hospital.contact_email },
              { label: 'Plan',           value: hospital.plan ? `${hospital.plan.name} — ₱${hospital.plan.price_monthly.toLocaleString()}/mo` : '—' },
              { label: 'Member Since',   value: new Date(hospital.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) },
              { label: 'Notes',          value: hospital.notes },
            ].map(row => (
              <div key={row.label} className="flex gap-2">
                <span className="text-gray-400 w-32 flex-shrink-0">{row.label}</span>
                <span className="text-gray-700">{row.value || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
