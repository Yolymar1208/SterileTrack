'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import {
  Inbox, QrCode, CheckCircle2, AlertCircle, Loader2, Package, Search,
  ClipboardCheck, PackageCheck, Flame, Archive, Edit3, Plus, Trash2,
  Save, X, ArrowRight
} from 'lucide-react'
import { InventoryItem, SetContent, STATUS_CONFIG } from '@/lib/types'
import { format } from 'date-fns'

interface ChecklistItem extends SetContent {
  checked: boolean
}

export default function ReceivingPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [qrInput, setQrInput] = useState('')
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [contents, setContents] = useState<ChecklistItem[]>([])
  const [remarks, setRemarks] = useState('')
  const [missingItems, setMissingItems] = useState('')
  const [shelfLocation, setShelfLocation] = useState('')

  const [editingList, setEditingList] = useState(false)
  const [newInstr, setNewInstr] = useState({ name: '', qty: 1 })

  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
          else setUserName(user.email?.split('@')[0] || 'Staff')
        })
    })
  }, [])

  async function lookupItem(code: string) {
    if (!code.trim()) return
    setSearching(true); setError(''); setSuccess(''); setItem(null); setContents([])
    setRemarks(''); setMissingItems(''); setShelfLocation('')

    let found: InventoryItem | null = null
    const { data } = await supabase.from('inventory_items').select('*').eq('qr_code', code.trim().toUpperCase()).single()
    if (data) found = data
    if (!found) {
      const { data: d2 } = await supabase.from('inventory_items').select('*').ilike('qr_code', code.trim()).single()
      if (d2) found = d2
    }

    if (!found) {
      setError(`No item found for "${code.trim()}".`); setSearching(false); return
    }

    setItem(found)
    setRemarks(found.current_remarks || '')
    setShelfLocation(found.shelf_location || '')

    const { data: cList } = await supabase
      .from('set_contents').select('*').eq('set_id', found.id).order('sort_order')
    setContents((cList || []).map(c => ({ ...c, checked: false })))
    setSearching(false)
  }

  function toggleCheck(id: string) {
    setContents(c => c.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }
  function checkAll() {
    const allChecked = contents.every(c => c.checked)
    setContents(c => c.map(i => ({ ...i, checked: !allChecked })))
  }

  async function addInstrument() {
    if (!item || !newInstr.name.trim()) return
    const { data } = await supabase.from('set_contents').insert({
      set_id: item.id,
      instrument_name: newInstr.name.trim(),
      quantity: newInstr.qty,
      sort_order: contents.length + 1,
    }).select().single()
    if (data) {
      setContents(c => [...c, { ...data, checked: true }])
      setNewInstr({ name: '', qty: 1 })
    }
  }

  async function removeInstrument(id: string) {
    await supabase.from('set_contents').delete().eq('id', id)
    setContents(c => c.filter(i => i.id !== id))
  }

  async function logAuditEntry(action: string, notes?: string) {
    if (!item || !userId) return
    await supabase.from('audit_logs').insert({
      item_id: item.id, item_name: item.name, item_qr_code: item.qr_code,
      action, performed_by_id: userId, performed_by_name: userName,
      department: userDept, location: 'CSSD Receiving Area',
      device_used: 'Web Browser', notes: notes || null,
    })
  }

  // STEP 1 — Receive at CSSD
  async function markReceived() {
    if (!item || !userId) return
    setLoading(true); setError('')
    await supabase.from('inventory_items').update({
      status: 'received', location: 'CSSD Receiving Area',
      last_user_id: userId, last_user_name: userName,
      current_remarks: remarks || null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)
    await logAuditEntry('received_at_cssd', remarks)
    if (missingItems) {
      await supabase.from('alerts').insert({
        alert_type: 'missing_items', severity: 'critical',
        title: `Missing instruments in ${item.name}`,
        body: `Reported by ${userName} during receiving: ${missingItems}`,
        item_id: item.id, item_name: item.name,
      })
    }
    setSuccess('Set received and inspected ✓'); setLoading(false)
    await lookupItem(item.qr_code)
  }

  // STEP 2 — Pack
  async function markPacked() {
    if (!item || !userId) return
    setLoading(true); setError('')

    const checkedCount = contents.filter(c => c.checked).length
    const totalCount = contents.length
    const inspectionNote = `Inspection: ${checkedCount}/${totalCount} items verified. ${remarks || ''}`

    await supabase.from('inspections').insert({
      item_id: item.id, item_name: item.name,
      inspected_by_id: userId, inspected_by_name: userName,
      completeness_passed: checkedCount === totalCount && totalCount > 0,
      functionality_passed: true, cleanliness_passed: true,
      remarks: remarks, missing_items: missingItems || null,
    })

    await supabase.from('inventory_items').update({
      status: 'packed', location: 'Sterilization Queue',
      last_user_id: userId, last_user_name: userName,
      current_remarks: remarks || null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    await logAuditEntry('packed_for_sterilization', inspectionNote)

    setSuccess('Set packed and ready for sterilization 🔥'); setLoading(false)
    await lookupItem(item.qr_code)
  }

  // STEP 3 — Confirm Sterile (tape check)
  async function confirmSterile() {
    if (!item || !userId || !shelfLocation.trim()) {
      if (!shelfLocation.trim()) setError('Please enter a shelf location.')
      return
    }
    setLoading(true); setError('')
    const now = new Date()
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await supabase.from('inventory_items').update({
      status: 'sterile', location: 'Storage', shelf_location: shelfLocation.trim(),
      sterilization_date: now.toISOString(), expiry_date: expiry.toISOString(),
      last_user_id: userId, last_user_name: userName,
      current_remarks: null,
      updated_at: now.toISOString(),
    }).eq('id', item.id)

    await logAuditEntry('placed_on_shelf', `Sterilization tape verified. Shelf: ${shelfLocation}. ${remarks || ''}`)

    setSuccess(`Set verified sterile and placed on ${shelfLocation} ✓`); setLoading(false)
    setTimeout(() => {
      setItem(null); setQrInput(''); setContents([]); setRemarks(''); setShelfLocation(''); setSuccess('')
      inputRef.current?.focus()
    }, 2000)
  }

  // Step indicator
  function getCurrentStep(): 1 | 2 | 3 {
    if (!item) return 1
    if (item.status === 'received') return 2
    if (item.status === 'packed') return 3
    return 1
  }
  const step = getCurrentStep()
  const cfg = item ? STATUS_CONFIG[item.status] : null

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Inbox size={22} className="text-brand-500" /> CSSD Receiving Area
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Receive instruments → Inspect & Pack → Sterilize → Place on Shelf
          </p>
        </div>

        {/* QR scan */}
        <div className="card p-5 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Scan Instrument Set QR Code</label>
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={qrInput}
              onChange={e => setQrInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupItem(qrInput)}
              placeholder="e.g. MAJOR-001, ORTHO-002…"
              className="input-field flex-1 text-base font-mono" />
            <button onClick={() => lookupItem(qrInput)} disabled={!qrInput.trim() || searching} className="btn-primary px-5">
              {searching ? <Loader2 size={16} className="animate-spin" /> : <><Search size={15} /> Find</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="card border-red-200 bg-red-50 p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="card border-green-200 bg-green-50 p-4 mb-4 flex items-start gap-3">
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
        )}

        {item && (
          <>
            {/* Item header */}
            <div className="card p-5 mb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package size={22} className="text-brand-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-800 text-lg">{item.name}</h2>
                  <p className="text-sm text-gray-500">{item.description || item.item_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{item.qr_code}</p>
                </div>
                {cfg && <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>}
              </div>

              {/* Workflow step indicator */}
              <div className="flex items-center gap-1">
                {[
                  { n: 1, label: 'Receive & Inspect', icon: ClipboardCheck },
                  { n: 2, label: 'Pack', icon: PackageCheck },
                  { n: 3, label: 'Confirm Sterile', icon: Archive },
                ].map((s, i) => {
                  const done = step > s.n
                  const active = step === s.n
                  return (
                    <div key={s.n} className="flex-1 flex items-center gap-1">
                      <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center ${
                        active ? 'bg-brand-500 text-white' : done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {done ? <CheckCircle2 size={12} /> : <s.icon size={12} />}
                        <span className="hidden sm:inline">{s.label}</span>
                        <span className="sm:hidden">Step {s.n}</span>
                      </div>
                      {i < 2 && <ArrowRight size={12} className="text-gray-300 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* STEP 1 & 2: Inspection checklist */}
            {(step === 1 || step === 2) && (
              <div className="card p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                    <ClipboardCheck size={15} className="text-brand-500" /> Inspection Checklist
                    <span className="text-xs font-normal text-gray-400">
                      ({contents.filter(c => c.checked).length}/{contents.length} checked)
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingList(!editingList)} className="text-xs text-brand-500 font-medium flex items-center gap-1">
                      {editingList ? <><X size={11} /> Done</> : <><Edit3 size={11} /> Edit List</>}
                    </button>
                  </div>
                </div>

                {contents.length === 0 && !editingList && (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">No instruments in this set's list yet.</p>
                    <button onClick={() => setEditingList(true)} className="text-xs text-brand-500 font-medium mt-2">
                      + Add instruments to the checklist
                    </button>
                  </div>
                )}

                {contents.length > 0 && (
                  <>
                    {!editingList && (
                      <button onClick={checkAll} className="text-xs text-brand-500 font-medium mb-2">
                        {contents.every(c => c.checked) ? 'Uncheck all' : 'Check all'}
                      </button>
                    )}
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {contents.map(c => (
                        <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                          editingList ? 'bg-gray-50' : c.checked ? 'bg-green-50' : 'bg-white border border-gray-100 hover:bg-gray-50'
                        }`}>
                          {!editingList && (
                            <input type="checkbox" checked={c.checked} onChange={() => toggleCheck(c.id)}
                              className="w-5 h-5 rounded text-brand-500 focus:ring-brand-400 flex-shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className={`text-sm ${c.checked && !editingList ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                              {c.instrument_name}
                            </div>
                          </div>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                            ×{c.quantity}
                          </span>
                          {editingList && (
                            <button onClick={() => removeInstrument(c.id)} className="text-red-400 hover:text-red-600">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {editingList && (
                  <div className="mt-3 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Instrument name</label>
                      <input type="text" value={newInstr.name}
                        onChange={e => setNewInstr({...newInstr, name: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && addInstrument()}
                        placeholder="e.g. Mayo Scissors 6&quot;"
                        className="input-field" />
                    </div>
                    <div className="w-20">
                      <label className="text-xs text-gray-500">Qty</label>
                      <input type="number" min={1} value={newInstr.qty}
                        onChange={e => setNewInstr({...newInstr, qty: parseInt(e.target.value) || 1})}
                        className="input-field" />
                    </div>
                    <button onClick={addInstrument} disabled={!newInstr.name.trim()} className="btn-primary px-3 py-2 text-sm">
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Remarks (always visible if there's an item) */}
            {(step === 1 || step === 2) && (
              <div className="card p-5 mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                    placeholder="Functionality issues, cleanliness concerns, condition notes…"
                    rows={2} className="input-field resize-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Missing Items <span className="text-gray-400 font-normal">(if any)</span>
                  </label>
                  <input type="text" value={missingItems} onChange={e => setMissingItems(e.target.value)}
                    placeholder="e.g. 1× Allis Forceps missing"
                    className="input-field text-sm" />
                  {missingItems && (
                    <p className="text-xs text-amber-600 mt-1">⚠ An alert will be created for missing items.</p>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Shelf location */}
            {step === 3 && (
              <div className="card p-5 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ✅ Sterilization Tape Confirmed — Shelf Location
                </label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {['Shelf A1','Shelf A2','Shelf B1','Shelf B2','Shelf C1','Shelf C2','Shelf D1'].map(s => (
                    <button key={s} onClick={() => setShelfLocation(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        shelfLocation === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
                <input type="text" value={shelfLocation} onChange={e => setShelfLocation(e.target.value)}
                  placeholder="Or type custom shelf location…"
                  className="input-field text-sm" />
              </div>
            )}

            {/* Action buttons */}
            <div className="grid gap-2">
              {step === 1 && (
                <button onClick={markReceived} disabled={loading}
                  className="w-full py-3.5 rounded-xl text-base font-semibold bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center gap-2 shadow-sm">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><ClipboardCheck size={18} /> Mark as Received</>}
                </button>
              )}
              {step === 2 && (
                <button onClick={markPacked} disabled={loading}
                  className="w-full py-3.5 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2 shadow-sm">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><Flame size={18} /> Pack & Send to Sterilization</>}
                </button>
              )}
              {step === 3 && (
                <button onClick={confirmSterile} disabled={loading || !shelfLocation.trim()}
                  className="w-full py-3.5 rounded-xl text-base font-semibold bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white flex items-center justify-center gap-2 shadow-sm">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <><Archive size={18} /> Confirm Sterile & Place on Shelf</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
