'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { QrCode, CheckCircle2, AlertCircle, Loader2, ArrowRight, Package } from 'lucide-react'
import { InventoryItem, ActionType, STATUS_CONFIG, ACTION_LABELS } from '@/lib/types'
import { format } from 'date-fns'

const ACTIONS: { value: ActionType; label: string; nextStatus: string }[] = [
  { value: 'released_to_or',          label: '🏥 Release to OR',           nextStatus: 'in_or' },
  { value: 'received_from_or',        label: '↩ Received from OR',          nextStatus: 'decontamination' },
  { value: 'sent_to_decontamination', label: '💧 Send to Decontamination',  nextStatus: 'decontamination' },
  { value: 'received_in_assembly',    label: '🔧 Received in Assembly',      nextStatus: 'assembly' },
  { value: 'sent_for_sterilization',  label: '🔥 Send for Sterilization',   nextStatus: 'sterilization' },
  { value: 'released_to_storage',     label: '📦 Release to Storage',        nextStatus: 'sterile' },
  { value: 'marked_missing',          label: '⚠ Mark as Missing',           nextStatus: 'missing' },
  { value: 'reported_damaged',        label: '⚡ Report Damaged',            nextStatus: 'damaged' },
]

export default function ScanPage() {
  const router = useRouter()
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
  const [profile, setProfile] = useState<{id: string; full_name: string; department: string | null} | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('id, full_name, department').eq('id', user.id).single()
        .then(({ data }) => setProfile(data))
    })
  }, [])

  async function lookupItem(code: string) {
    if (!code.trim()) return
    setSearching(true)
    setError('')
    setItem(null)
    setSelectedAction(null)
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('qr_code', code.trim())
      .single()
    if (error || !data) {
      setError(`No item found for QR code "${code.trim()}". Check the code and try again.`)
    } else {
      setItem(data)
    }
    setSearching(false)
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') lookupItem(qrInput)
  }

  async function handleSubmit() {
    if (!item || !selectedAction || !profile) return
    setLoading(true)
    setError('')

    const actionMeta = ACTIONS.find(a => a.value === selectedAction)

    // Update item status
    const { error: updateErr } = await supabase
      .from('inventory_items')
      .update({
        status: actionMeta?.nextStatus || item.status,
        location: location || item.location,
        last_user_id: profile.id,
        last_user_name: profile.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    // Create audit log
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      item_id: item.id,
      item_name: item.name,
      item_qr_code: item.qr_code,
      action: selectedAction,
      performed_by_id: profile.id,
      performed_by_name: profile.full_name,
      department: profile.department,
      location: location || item.location,
      device_used: 'Web Browser',
      notes: notes || null,
    })

    if (auditErr) { setError(auditErr.message); setLoading(false); return }

    // If marking missing, create alert
    if (selectedAction === 'marked_missing') {
      await supabase.from('alerts').insert({
        alert_type: 'missing_item',
        severity: 'critical',
        title: `Missing: ${item.name}`,
        body: `Reported missing by ${profile.full_name}${notes ? '. Notes: ' + notes : ''}`,
        item_id: item.id,
        item_name: item.name,
      })
    }

    setSuccess(true)
    setLoading(false)

    // Auto-reset after 2.5s
    setTimeout(() => {
      setSuccess(false)
      setItem(null)
      setQrInput('')
      setSelectedAction(null)
      setLocation('')
      setNotes('')
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
          <p className="text-sm text-gray-500 mt-1">Scan a QR code or type it in to update an item's status</p>
        </div>

        {/* Scanner input */}
        <div className="card p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">QR Code</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Scan QR code or type item code…"
              className="input-field flex-1 text-base"
              autoFocus
            />
            <button
              onClick={() => lookupItem(qrInput)}
              disabled={!qrInput || searching}
              className="btn-primary px-4"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : 'Look up'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 Use a barcode scanner — it will auto-submit on scan
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="card border-red-200 bg-red-50 p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="card border-green-200 bg-green-50 p-5 mb-4 text-center">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-green-800 text-lg">Done! ✓</p>
            <p className="text-sm text-green-600 mt-1">Item updated. Ready to scan the next one.</p>
          </div>
        )}

        {/* Item found */}
        {item && !success && (
          <>
            {/* Item info */}
            <div className="card p-5 mb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={20} className="text-brand-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-800">{item.name}</h2>
                  <p className="text-sm text-gray-500">{item.description || item.item_type.replace(/_/g, ' ')}</p>
                </div>
                {cfg && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full status-${item.status}`}>
                    {cfg.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">QR Code</span>
                  <p className="font-mono font-medium text-gray-700 mt-0.5">{item.qr_code}</p>
                </div>
                <div>
                  <span className="text-gray-400">Current Location</span>
                  <p className="font-medium text-gray-700 mt-0.5">{item.location || '—'}</p>
                </div>
                {item.last_user_name && (
                  <div>
                    <span className="text-gray-400">Last Updated By</span>
                    <p className="font-medium text-gray-700 mt-0.5">{item.last_user_name}</p>
                  </div>
                )}
                {item.expiry_date && (
                  <div>
                    <span className="text-gray-400">Expiry Date</span>
                    <p className="font-medium text-gray-700 mt-0.5">
                      {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action selection */}
            <div className="card p-5 mb-4">
              <h3 className="font-medium text-gray-800 text-sm mb-3">What are you doing with this item?</h3>
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map(action => (
                  <button
                    key={action.value}
                    onClick={() => setSelectedAction(action.value)}
                    className={`p-3 rounded-xl text-left text-sm font-medium transition-all border ${
                      selectedAction === action.value
                        ? 'border-brand-400 bg-brand-50 text-brand-700'
                        : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location + Notes */}
            {selectedAction && (
              <div className="card p-5 mb-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location <span className="text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder={`e.g. OR 3, Shelf A1, Autoclave B…`}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400">(optional)</span></label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any additional notes…"
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedAction && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full btn-primary py-3 text-base justify-center"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Saving…</>
                ) : (
                  <>{ACTIONS.find(a => a.value === selectedAction)?.label} <ArrowRight size={16} /></>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </AppLayout>
  )
}
