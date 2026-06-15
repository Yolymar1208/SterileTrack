'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { QrCode, CheckCircle2, AlertCircle, Loader2, ArrowRight, Package, User } from 'lucide-react'
import { InventoryItem, ActionType, STATUS_CONFIG } from '@/lib/types'
import { format } from 'date-fns'

const ACTIONS: { value: ActionType; label: string; nextStatus: string }[] = [
  { value: 'released_to_or',          label: '🏥 Release to OR',           nextStatus: 'in_or' },
  { value: 'received_from_or',        label: '↩️ Received from OR',         nextStatus: 'decontamination' },
  { value: 'sent_to_decontamination', label: '💧 Send to Decontamination',  nextStatus: 'decontamination' },
  { value: 'received_in_assembly',    label: '🔧 Received in Assembly',      nextStatus: 'assembly' },
  { value: 'sent_for_sterilization',  label: '🔥 Send for Sterilization',   nextStatus: 'sterilization' },
  { value: 'released_to_storage',     label: '📦 Release to Storage',       nextStatus: 'sterile' },
  { value: 'marked_missing',          label: '⚠️ Mark as Missing',          nextStatus: 'missing' },
  { value: 'reported_damaged',        label: '⚡ Report Damaged',            nextStatus: 'damaged' },
]

export default function ScanPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [qrInput, setQrInput] = useState('')
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Staff')
  const [userDept, setUserDept] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('full_name, department').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { setUserName(data.full_name); setUserDept(data.department) }
          else { setUserName(user.email?.split('@')[0] || 'Staff') }
        })
    })
  }, [])

  async function lookupItem(code: string) {
    if (!code.trim()) return
    setSearching(true); setError(''); setItem(null); setSelectedAction(null)
    const { data } = await supabase.from('inventory_items').select('*').eq('qr_code', code.trim().toUpperCase()).single()
    if (data) { setItem(data) } else {
      const { data: d2 } = await supabase.from('inventory_items').select('*').ilike('qr_code', code.trim()).single()
      if (d2) setItem(d2)
      else setError(`No item found for "${code.trim()}". Check the QR code and try again.`)
    }
    setSearching(false)
  }

  async function handleSubmit() {
    if (!item || !selectedAction || !userId) {
      if (!userId) setError('Not logged in — please refresh and sign in again.')
      return
    }
    setLoading(true); setError('')
    const nextStatus = ACTIONS.find(a => a.value === selectedAction)?.nextStatus || item.status

    const { error: e1 } = await supabase.from('inventory_items').update({
      status: nextStatus,
      location: location || item.location,
      last_user_id: userId,
      last_user_name: userName,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    if (e1) { setError('Update failed: ' + e1.message); setLoading(false); return }

    const { error: e2 } = await supabase.from('audit_logs').insert({
      item_id: item.id, item_name: item.name, item_qr_code: item.qr_code,
      action: selectedAction, performed_by_id: userId, performed_by_name: userName,
      department: userDept, location: location || item.location,
      device_used: 'Web Browser', notes: notes || null,
    })
    if (e2) { setError('Item updated but log failed: ' + e2.message); setLoading(false); return }

    if (selectedAction === 'marked_missing') {
      await supabase.from('alerts').insert({
        alert_type: 'missing_item', severity: 'critical',
        title: `Missing: ${item.name}`,
        body: `Reported by ${userName}${notes ? '. ' + notes : ''}`,
        item_id: item.id, item_name: item.name,
      })
    }

    setSuccess(true); setLoading(false)
    setTimeout(() => {
      setSuccess(false); setItem(null); setQrInput(''); setSelectedAction(null); setLocation(''); setNotes('')
      inputRef.current?.focus()
    }, 2500)
  }

  const cfg = item ? STATUS_CONFIG[item.status] : null

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <QrCode size={22} className="text-brand-500" /> Scan Item
          </h1>
          <p className="text-sm text-gray-500 mt-1">Scan or type a QR code to update an item</p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <User size={11} /> Logged in as <strong>{userName}</strong>
          </p>
        </div>

        <div className="card p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">QR Code / Item Code</label>
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupItem(qrInput)}
              placeholder="e.g. MAJOR-001, ORTHO-002…"
              className="input-field flex-1 text-base font-mono" />
            <button onClick={() => lookupItem(qrInput)} disabled={!qrInput.trim() || searching} className="btn-primary px-5">
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Find'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">💡 Barcode scanner will auto-submit. Or press Enter after typing.</p>
        </div>

        {error && (
          <div className="card border-red-200 bg-red-50 p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div><p className="text-sm font-medium text-red-700">Error</p><p className="text-sm text-red-600 mt-0.5">{error}</p></div>
          </div>
        )}

        {success && (
          <div className="card border-green-200 bg-green-50 p-6 mb-4 text-center">
            <CheckCircle2 size={44} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-green-800 text-lg">Done! ✓</p>
            <p className="text-sm text-green-600 mt-1">Action recorded successfully.</p>
            <p className="text-xs text-green-500 mt-2">Ready to scan the next item…</p>
          </div>
        )}

        {item && !success && (
          <>
            <div className="card p-5 mb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package size={22} className="text-brand-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-800 text-lg">{item.name}</h2>
                  <p className="text-sm text-gray-500">{item.description || item.item_type.replace(/_/g, ' ')}</p>
                </div>
                {cfg && <span className={`text-xs font-medium px-2.5 py-1 rounded-full status-${item.status} flex-shrink-0`}>{cfg.label}</span>}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 rounded-xl p-3">
                <div><span className="text-gray-400 block mb-0.5">QR Code</span><span className="font-mono font-semibold text-gray-700">{item.qr_code}</span></div>
                <div><span className="text-gray-400 block mb-0.5">Location</span><span className="font-medium text-gray-700">{item.location || '—'}</span></div>
                {item.last_user_name && <div><span className="text-gray-400 block mb-0.5">Last by</span><span className="font-medium text-gray-700">{item.last_user_name}</span></div>}
                {item.expiry_date && <div><span className="text-gray-400 block mb-0.5">Expires</span><span className="font-medium text-gray-700">{format(new Date(item.expiry_date), 'MMM d, yyyy')}</span></div>}
              </div>
            </div>

            <div className="card p-5 mb-4">
              <h3 className="font-medium text-gray-800 text-sm mb-3">What are you doing with this item? <span className="text-red-400">*</span></h3>
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map(action => (
                  <button key={action.value} onClick={() => setSelectedAction(action.value)}
                    className={`p-3 rounded-xl text-left text-sm font-medium transition-all border-2 ${
                      selectedAction === action.value
                        ? 'border-brand-400 bg-brand-50 text-brand-800 shadow-sm'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-brand-200 hover:bg-brand-50'
                    }`}>
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedAction && (
              <div className="card p-5 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. OR 3, Shelf A1…" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes…" rows={2} className="input-field resize-none" />
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={!selectedAction || loading}
              className={`w-full py-4 rounded-xl text-base font-semibold flex items-center justify-center gap-2 transition-all ${
                selectedAction && !loading ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              {loading ? <><Loader2 size={20} className="animate-spin" /> Saving…</>
                : selectedAction ? <>{ACTIONS.find(a => a.value === selectedAction)?.label} <ArrowRight size={18} /></>
                : 'Select an action above first'}
            </button>
          </>
        )}
      </div>
    </AppLayout>
  )
}
