'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Building2, ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

type Plan = { id: string; name: string; price_monthly: number }

export default function NewHospitalPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [plans, setPlans]     = useState<Plan[]>([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState({
    name:           '',
    slug:           '',
    address:        '',
    contact_person: '',
    contact_email:  '',
    contact_phone:  '',
    plan_id:        '',
    status:         'active',
    notes:          '',
    // Staff account to create
    staff_name:     '',
    staff_email:    '',
    staff_password: '',
  })

  useEffect(() => {
    supabase.from('plans').select('id, name, price_monthly').order('price_monthly')
      .then(({ data }) => {
        setPlans(data || [])
        if (data && data.length > 0) {
          const starter = data.find(p => p.name === 'Starter') || data[0]
          setForm(f => ({ ...f, plan_id: starter.id }))
        }
      })
  }, [])

  // Auto-generate slug from name
  function handleNameChange(name: string) {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30)
    setForm(f => ({ ...f, name, slug }))
  }

  async function handleSubmit() {
    setError('')
    if (!form.name || !form.slug || !form.plan_id) {
      setError('Hospital name, slug, and plan are required.')
      return
    }
    if (!form.staff_email || !form.staff_password || !form.staff_name) {
      setError('Admin staff name, email, and password are required.')
      return
    }
    if (form.staff_password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setSaving(true)

    try {
      // 1. Create hospital record
      const { data: hospital, error: hospErr } = await supabase
        .from('hospitals')
        .insert({
          name:           form.name,
          slug:           form.slug,
          address:        form.address || null,
          contact_person: form.contact_person || null,
          contact_email:  form.contact_email || null,
          contact_phone:  form.contact_phone || null,
          plan_id:        form.plan_id,
          status:         form.status,
          trial_ends_at:  form.status === 'trial' ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
          activated_at:   form.status === 'active' ? new Date().toISOString() : null,
          notes:          form.notes || null,
        })
        .select()
        .single()

      if (hospErr) { setError(hospErr.message); setSaving(false); return }

      // 2. Create the admin staff account via Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email:    form.staff_email,
        password: form.staff_password,
        options: {
          data: { full_name: form.staff_name }
        }
      })

      if (authErr) {
        setError(`Hospital created but staff account failed: ${authErr.message}. Create staff manually in Supabase Auth.`)
        setSaving(false)
        return
      }

      // 3. Create profile linked to hospital
      if (authData.user) {
        await supabase.from('profiles').upsert({
          id:             authData.user.id,
          full_name:      form.staff_name,
          role:           'hospital_admin',
          hospital_id:    hospital.id,
          avatar_initials: form.staff_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
        })
      }

      router.push(`/superadmin/hospitals/${hospital.id}`)
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid #E5E7EB', outline: 'none', background: '#fff',
    color: '#111827',
  }

  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 5
  } as React.CSSProperties

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Overview
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Building2 size={22} className="text-brand-500" /> New Hospital
        </h1>
        <p className="text-sm text-gray-500 mt-1">Create a new hospital account on SterileTrack</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm"
          style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Hospital Details */}
      <div className="card p-5 mb-4">
        <h2 className="font-medium text-gray-800 text-sm mb-4">Hospital Details</h2>
        <div className="space-y-3">

          <div>
            <label style={labelStyle}>Hospital Name *</label>
            <input style={inputStyle} value={form.name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Baguio General Hospital" />
          </div>

          <div>
            <label style={labelStyle}>URL Slug * <span className="text-gray-400 font-normal">(used in URL: steriletrack.com/slug/dashboard)</span></label>
            <input style={inputStyle} value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="e.g. bghmc" />
            {form.slug && (
              <p className="text-xs text-gray-400 mt-1">
                → steriletrack.com/<strong>{form.slug}</strong>/dashboard
              </p>
            )}
          </div>

          <div>
            <label style={labelStyle}>Address</label>
            <input style={inputStyle} value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Hospital address" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input style={inputStyle} value={form.contact_person}
                onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
                placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Contact Phone</label>
              <input style={inputStyle} value={form.contact_phone}
                onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                placeholder="e.g. 09XX XXX XXXX" />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Contact Email</label>
            <input style={inputStyle} type="email" value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
              placeholder="hospital@email.com" />
          </div>
        </div>
      </div>

      {/* Plan & Status */}
      <div className="card p-5 mb-4">
        <h2 className="font-medium text-gray-800 text-sm mb-4">Plan & Status</h2>
        <div className="space-y-3">

          <div>
            <label style={labelStyle}>Plan *</label>
            <select style={inputStyle} value={form.plan_id}
              onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}>
              {plans.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.price_monthly > 0 ? `— ₱${p.price_monthly.toLocaleString()}/mo` : '— Free'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Account Status *</label>
            <select style={inputStyle} value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active — full access immediately</option>
              <option value="trial">Trial — 14-day free trial</option>
              <option value="inactive">Inactive — no access yet</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Internal Notes</label>
            <textarea style={{ ...inputStyle, resize: 'vertical' }} value={form.notes} rows={2}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes about this hospital account (only you can see this)" />
          </div>
        </div>
      </div>

      {/* Admin Staff Account */}
      <div className="card p-5 mb-4">
        <h2 className="font-medium text-gray-800 text-sm mb-1">Hospital Admin Account</h2>
        <p className="text-xs text-gray-400 mb-4">This person will be the hospital's admin — they can manage staff and settings.</p>
        <div className="space-y-3">

          <div>
            <label style={labelStyle}>Full Name *</label>
            <input style={inputStyle} value={form.staff_name}
              onChange={e => setForm(f => ({ ...f, staff_name: e.target.value }))}
              placeholder="Admin's full name" />
          </div>

          <div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" value={form.staff_email}
              onChange={e => setForm(f => ({ ...f, staff_email: e.target.value }))}
              placeholder="admin@hospital.com" />
          </div>

          <div>
            <label style={labelStyle}>Temporary Password * <span className="text-gray-400 font-normal">(min 8 characters)</span></label>
            <input style={inputStyle} type="text" value={form.staff_password}
              onChange={e => setForm(f => ({ ...f, staff_password: e.target.value }))}
              placeholder="They can change this after first login" />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/superadmin"
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-center border border-gray-200 text-gray-600 hover:bg-gray-50">
          Cancel
        </Link>
        <button onClick={handleSubmit} disabled={saving}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2"
          style={{ background: saving ? '#9CA3AF' : 'linear-gradient(135deg, #00C9D4, #0088A9)', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Creating…' : <><Save size={14} /> Create Hospital</>}
        </button>
      </div>
    </div>
  )
}
