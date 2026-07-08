'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  CreditCard, Plus, Check, ChevronDown,
  ChevronUp, Building2, ArrowLeft, X
} from 'lucide-react'
import Link from 'next/link'

type Payment = {
  id: string
  hospital_id: string
  amount: number
  plan_name: string | null
  period: string | null
  notes: string | null
  recorded_by: string | null
  paid_at: string
}

type Hospital = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  status: string
  plan: { name: string; price_monthly: number } | null
  payments: Payment[]
  lastPaid: string | null
  totalPaid: number
}

export default function BillingPage() {
  const supabase = createClient()
  const [hospitals, setHospitals]     = useState<Hospital[]>([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<string | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const [modalHospital, setModalHospital] = useState<Hospital | null>(null)
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState('')

  const [form, setForm] = useState({
    amount: '',
    period: '',
    notes: '',
  })

  const now = new Date()
  const currentPeriod = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)

    const { data: hosps } = await supabase
      .from('hospitals')
      .select('*, plan:plans(name, price_monthly)')
      .order('name')

    const { data: plans } = await supabase.from('plans').select('*')
    const planMap = Object.fromEntries((plans || []).map((p: any) => [p.id, p]))

    const { data: allPayments } = await supabase
      .from('payments')
      .select('*')
      .order('paid_at', { ascending: false })

    const enriched: Hospital[] = (hosps || []).map((h: any) => {
      const hPayments = (allPayments || []).filter((p: Payment) => p.hospital_id === h.id)
      const totalPaid = hPayments.reduce((sum, p) => sum + p.amount, 0)
      const lastPaid  = hPayments.length > 0 ? hPayments[0].paid_at : null
      return {
        ...h,
        plan: planMap[h.plan_id] || null,
        payments: hPayments,
        totalPaid,
        lastPaid,
      }
    })

    setHospitals(enriched)
    setLoading(false)
  }

  function openPayment(h: Hospital) {
    setModalHospital(h)
    setForm({
      amount: h.plan?.price_monthly?.toString() || '',
      period: currentPeriod,
      notes: '',
    })
    setShowModal(true)
    setMsg('')
  }

  async function handleSavePayment() {
    if (!modalHospital || !form.amount) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile }  = await supabase.from('profiles').select('full_name').eq('id', user?.id).single()

    const { error } = await supabase.from('payments').insert({
      hospital_id:  modalHospital.id,
      amount:       parseInt(form.amount),
      plan_name:    modalHospital.plan?.name || null,
      period:       form.period,
      notes:        form.notes || null,
      recorded_by:  profile?.full_name || 'Admin',
      paid_at:      new Date().toISOString(),
    })

    if (error) { setMsg('Error: ' + error.message) }
    else {
      setShowModal(false)
      setMsg('')
      load()
    }
    setSaving(false)
  }

  async function deletePayment(id: string) {
    await supabase.from('payments').delete().eq('id', id)
    load()
  }

  const totalMRR     = hospitals.filter(h => h.status === 'active').reduce((s, h) => s + (h.plan?.price_monthly || 0), 0)
  const totalCollected = hospitals.reduce((s, h) => s + h.totalPaid, 0)
  const paidThisMonth  = hospitals.filter(h => h.payments.some(p => p.period === currentPeriod)).length
  const unpaidThisMonth = hospitals.filter(h => h.status === 'active' && (h.plan?.price_monthly || 0) > 0 && !h.payments.some(p => p.period === currentPeriod)).length

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    border: '1px solid #E5E7EB', outline: 'none', background: '#F9FAFB', color: '#0D1117',
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <Link href="/superadmin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={15} /> Back to Overview
      </Link>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <CreditCard size={22} className="text-brand-500" /> Billing Tracker
        </h1>
        <p className="text-sm text-gray-500 mt-1">Track manual payments from hospital accounts</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Monthly MRR',        value: `₱${totalMRR.toLocaleString()}`,        color: '#00C9D4' },
          { label: 'Total Collected',    value: `₱${totalCollected.toLocaleString()}`,   color: '#38A169' },
          { label: `Paid (${now.toLocaleString('default', { month: 'short' })})`, value: paidThisMonth,   color: '#2B6CB0' },
          { label: 'Unpaid This Month',  value: unpaidThisMonth, color: '#E53E3E' },
        ].map(tile => (
          <div key={tile.label} className="card p-4">
            <div className="text-xs text-gray-500 font-medium mb-1">{tile.label}</div>
            <div className="text-xl font-semibold" style={{ color: tile.color }}>{tile.value}</div>
          </div>
        ))}
      </div>

      {/* Hospital billing list */}
      <div className="card divide-y divide-gray-50">
        <div className="px-4 py-3">
          <h2 className="font-medium text-gray-800 text-sm">Payment Status — {currentPeriod}</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : hospitals.map(h => {
          const paidThisPeriod = h.payments.some(p => p.period === currentPeriod)
          const isPaying       = (h.plan?.price_monthly || 0) > 0 && h.status === 'active'
          const isExpanded     = expanded === h.id

          return (
            <div key={h.id}>
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Logo */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                  style={{ background: h.logo_url ? '#fff' : 'linear-gradient(135deg, #E0FAFB, #B3F2F5)', border: h.logo_url ? '1px solid #E5E7EB' : 'none' }}>
                  {h.logo_url
                    ? <img src={h.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} />
                    : <Building2 size={16} style={{ color: '#00B8C2' }} />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{h.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                    <span>{h.plan?.name || 'No plan'}</span>
                    {isPaying && <span>· ₱{h.plan?.price_monthly?.toLocaleString()}/mo</span>}
                    {h.lastPaid && <span>· Last paid: {new Date(h.lastPaid).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span>}
                    {h.totalPaid > 0 && <span>· Total: ₱{h.totalPaid.toLocaleString()}</span>}
                  </div>
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isPaying && (
                    paidThisPeriod ? (
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full"
                        style={{ background: '#C6F6D5', color: '#276749' }}>
                        <Check size={11} /> Paid
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                        Unpaid
                      </span>
                    )
                  )}
                  {!isPaying && (
                    <span className="text-xs text-gray-400 px-2 py-1 rounded-full bg-gray-100">Free</span>
                  )}
                  {isPaying && !paidThisPeriod && (
                    <button onClick={() => openPayment(h)}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg text-white"
                      style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)' }}>
                      <Plus size={11} /> Log Payment
                    </button>
                  )}
                  {isPaying && paidThisPeriod && (
                    <button onClick={() => openPayment(h)}
                      className="text-xs text-brand-500 font-medium px-2 py-1 rounded-lg hover:bg-brand-50">
                      + Add
                    </button>
                  )}
                  {h.payments.length > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : h.id)}
                      className="text-gray-400 hover:text-gray-600 p-1">
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                </div>
              </div>

              {/* Payment history */}
              {isExpanded && h.payments.length > 0 && (
                <div className="px-4 pb-3 bg-gray-50">
                  <div className="text-xs font-medium text-gray-500 mb-2 pt-2">Payment History</div>
                  <div className="space-y-1.5">
                    {h.payments.map(p => (
                      <div key={p.id} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <div className="flex-1">
                          <span className="font-semibold text-gray-700">₱{p.amount.toLocaleString()}</span>
                          {p.period && <span className="text-gray-400 ml-2">{p.period}</span>}
                          {p.notes && <span className="text-gray-400 ml-2">· {p.notes}</span>}
                        </div>
                        <div className="text-gray-400">
                          {new Date(p.paid_at).toLocaleDateString('en-PH', { dateStyle: 'short' })}
                        </div>
                        {p.recorded_by && <div className="text-gray-400">by {p.recorded_by}</div>}
                        <button onClick={() => deletePayment(p.id)}
                          className="text-red-400 hover:text-red-600 p-0.5">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Log Payment Modal */}
      {showModal && modalHospital && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-800">Log Payment</h2>
                <p className="text-xs text-gray-500 mt-0.5">{modalHospital.name}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {msg && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{msg}</div>}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount (₱) *</label>
                <input style={inputStyle} type="number" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="e.g. 3500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Period *</label>
                <input style={inputStyle} value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  placeholder="e.g. July 2026" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes</label>
                <input style={inputStyle} value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional — payment method, reference, etc." />
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
                <button onClick={handleSavePayment} disabled={!form.amount || saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: form.amount && !saving ? 'linear-gradient(135deg, #00C9D4, #0088A9)' : '#9CA3AF', cursor: !form.amount || saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : <><Check size={14} /> Log Payment</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
