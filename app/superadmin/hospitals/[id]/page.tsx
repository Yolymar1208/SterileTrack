'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import {
  ArrowLeft, Building2, Users, Package, History,
  AlertTriangle, CheckCircle, XCircle, Clock,
  Edit2, Save, X, ExternalLink, Mail, Shield,
  UserX, RefreshCw, ChevronRight
} from 'lucide-react'

type Plan = { id: string; name: string; price_monthly: number }
type Hospital = {
  id: string; name: string; slug: string; status: string
  address: string | null; contact_person: string | null
  contact_email: string | null; contact_phone: string | null
  trial_ends_at: string | null; activated_at: string | null
  notes: string | null; created_at: string; logo_url: string | null
  plan: Plan | null
}

type Staff = {
  id: string
  full_name: string
  role: string
  employee_id: string | null
  qr_code: string | null
  department: string | null
  hospital_id: string
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',    color: '#276749', bg: '#C6F6D5' },
  trial:     { label: 'Trial',     color: '#975A16', bg: '#FEFCBF' },
  inactive:  { label: 'Inactive',  color: '#9B2C2C', bg: '#FED7D7' },
  suspended: { label: 'Suspended', color: '#744210', bg: '#FEEBC8' },
}

const ROLE_LABELS: Record<string, string> = {
  cssd_technician:      'CSSD Technician',
  cssd_supervisor:      'CSSD Supervisor',
  or_nurse:             'OR Nurse',
  or_supervisor:        'OR Supervisor',
  hospital_admin:       'Hospital Admin',
  system_admin:         'System Admin',
  infection_control:    'Infection Control',
  materials_management: 'Materials Management',
}

export default function HospitalDetailPage() {
  const { id }   = useParams()
  const router   = useRouter()
  const supabase = createClient()

  const [hospital, setHospital]   = useState<Hospital | null>(null)
  const [plans, setPlans]         = useState<Plan[]>([])
  const [stats, setStats]         = useState({ staff: 0, sets: 0, alerts: 0, logs: 0 })
  const [staff, setStaff]         = useState<Staff[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<'details' | 'staff'>('details')
  const [editing, setEditing]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')
  const [editForm, setEditForm]   = useState<Partial<Hospital & { plan_id: string }>>({})
  const [sendingReset, setSendingReset] = useState<string | null>(null)

  useEffect(() => { load() }, [id])

  async function load() {
    const [{ data: h }, { data: pl }] = await Promise.all([
      supabase.from('hospitals').select('*, plan:plans(id, name, price_monthly)').eq('id', id).single(),
      supabase.from('plans').select('id, name, price_monthly').order('price_monthly'),
    ])
    if (h) { setHospital(h); setEditForm({ ...h, plan_id: h.plan?.id || '' }) }
    setPlans(pl || [])

    const [
      { count: staffCount },
      { count: sets },
      { count: alerts },
      { count: logs },
    ] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('hospital_id', id),
      supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('hospital_id', id),
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('hospital_id', id).eq('is_resolved', false),
      supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('hospital_id', id),
    ])
    setStats({ staff: staffCount || 0, sets: sets || 0, alerts: alerts || 0, logs: logs || 0 })

    const { data: staffData } = await supabase
      .from('profiles')
      .select('id, full_name, role, employee_id, qr_code, department, hospital_id')
      .eq('hospital_id', id as string)
      .order('full_name')
    setStaff(staffData || [])
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
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Saved!'); setEditing(false); load() }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleStatusChange(newStatus: string) {
    const update: any = { status: newStatus, updated_at: new Date().toISOString() }
    if (newStatus === 'active' && !hospital?.activated_at) update.activated_at = new Date().toISOString()
    if (newStatus === 'trial') update.trial_ends_at = new Date(Date.now() + 14 * 86400000).toISOString()
    const { error } = await supabase.from('hospitals').update(update).eq('id', id as string)
    if (error) setMsg('Error: ' + error.message)
    else { setMsg(`Status → ${newStatus}`); load() }
    setTimeout(() => setMsg(''), 3000)
  }

  async function handlePasswordReset(staffMember: Staff) {
    setSendingReset(staffMember.id)
    // Get email from auth.users via profiles
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users?.find((u: any) => u.id === staffMember.id)
    if (!authUser?.email) {
      setMsg('Could not find email for this staff member')
      setSendingReset(null)
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(authUser.email, {
      redirectTo: `https://steriletrak.com/login`,
    })
    if (error) setMsg('Error: ' + error.message)
    else setMsg(`Password reset email sent to ${authUser.email}`)
    setSendingReset(null)
    setTimeout(() => setMsg(''), 4000)
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>
  if (!hospital) return <div className="p-8 text-center text-gray-400">Hospital not found</div>

  const s = STATUS_STYLE[hospital.status] || STATUS_STYLE.inactive
  const daysLeft = hospital.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(hospital.trial_ends_at).getTime() - Date.now()) / 86400000))
    : null

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid #E5E7EB', outline: 'none', background: '#F9FAFB', color: '#0D1117',
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
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: hospital.logo_url ? '#fff' : 'linear-gradient(135deg, #E0FAFB, #B3F2F5)', border: hospital.logo_url ? '1px solid #E5E7EB' : 'none' }}>
            {hospital.logo_url
              ? <img src={hospital.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }} />
              : <Building2 size={22} style={{ color: '#00B8C2' }} />
            }
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{hospital.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-gray-400">/{hospital.slug}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: s.color, background: s.bg }}>{s.label}</span>
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
          {tab === 'details' && (
            <button onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              {editing ? <><X size={13} /> Cancel</> : <><Edit2 size={13} /> Edit</>}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${msg.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
        {(['details', 'staff'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize"
            style={{
              background: tab === t ? '#fff' : 'transparent',
              color: tab === t ? '#0D1117' : '#6B7280',
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            {t} {t === 'staff' && `(${stats.staff})`}
          </button>
        ))}
      </div>

      {/* ── DETAILS TAB ── */}
      {tab === 'details' && (
        <>
          {/* Status Actions */}
          <div className="card p-4 mb-4">
            <h2 className="font-medium text-gray-800 text-sm mb-3">Account Status</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { status: 'active',   label: 'Activate',        icon: CheckCircle, activeColor: '#C6F6D5', activeText: '#276749' },
                { status: 'trial',    label: 'Set Trial +14d',  icon: Clock,       activeColor: '#FEFCBF', activeText: '#975A16' },
                { status: 'inactive', label: 'Deactivate',      icon: XCircle,     activeColor: '#FED7D7', activeText: '#9B2C2C' },
              ].map(btn => (
                <button key={btn.status} onClick={() => handleStatusChange(btn.status)}
                  disabled={hospital.status === btn.status}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors"
                  style={{
                    background: hospital.status === btn.status ? btn.activeColor : '#fff',
                    color: hospital.status === btn.status ? btn.activeText : '#374151',
                    borderColor: hospital.status === btn.status ? btn.activeColor : '#E5E7EB',
                    cursor: hospital.status === btn.status ? 'default' : 'pointer',
                  }}>
                  <btn.icon size={13} /> {btn.label}
                </button>
              ))}
            </div>
            {hospital.activated_at && (
              <p className="text-xs text-gray-400 mt-2">
                Activated: {new Date(hospital.activated_at).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
              </p>
            )}
          </div>

          {/* Details / Edit */}
          <div className="card p-5 mb-4">
            <h2 className="font-medium text-gray-800 text-sm mb-4">Hospital Details</h2>
            {editing ? (
              <div className="space-y-3">
                <div><label style={labelStyle}>Name</label><input style={inputStyle} value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label style={labelStyle}>Address</label><input style={inputStyle} value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label style={labelStyle}>Contact Person</label><input style={inputStyle} value={editForm.contact_person || ''} onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))} /></div>
                  <div><label style={labelStyle}>Contact Phone</label><input style={inputStyle} value={editForm.contact_phone || ''} onChange={e => setEditForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
                </div>
                <div><label style={labelStyle}>Contact Email</label><input style={inputStyle} type="email" value={editForm.contact_email || ''} onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div>
                  <label style={labelStyle}>Plan</label>
                  <select style={inputStyle} value={editForm.plan_id || ''} onChange={e => setEditForm(f => ({ ...f, plan_id: e.target.value }))}>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name} — ₱{p.price_monthly.toLocaleString()}/mo</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Internal Notes</label><textarea style={{ ...inputStyle, resize: 'vertical' } as any} rows={2} value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
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
        </>
      )}

      {/* ── STAFF TAB ── */}
      {tab === 'staff' && (
        <div className="card divide-y divide-gray-50">
          <div className="px-4 py-3">
            <h2 className="font-medium text-gray-800 text-sm">{stats.staff} Staff Members</h2>
          </div>

          {staff.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No staff members yet</p>
            </div>
          ) : staff.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center gap-3">
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 600, color: '#fff',
              }}>
                {s.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{s.full_name}</div>
                <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                  <span className="capitalize">{ROLE_LABELS[s.role] || s.role}</span>
                  {s.employee_id && <span>· {s.employee_id}</span>}
                  {s.qr_code && (
                    <span className="flex items-center gap-0.5 text-green-500">
                      <Shield size={10} /> QR paired
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handlePasswordReset(s)}
                  disabled={sendingReset === s.id}
                  title="Send password reset email"
                  className="flex items-center gap-1 text-xs text-gray-500 font-medium px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  {sendingReset === s.id
                    ? <RefreshCw size={11} className="animate-spin" />
                    : <Mail size={11} />
                  }
                  Reset PW
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
