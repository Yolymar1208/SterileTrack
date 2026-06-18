'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import {
  Inbox, Search, CheckCircle2, AlertCircle, Loader2, Package,
  ClipboardCheck, PackageCheck, Flame, Archive, Edit3, Plus, Trash2,
  Save, X, ArrowRight, Camera, User, ChevronDown, ChevronUp
} from 'lucide-react'
import { InventoryItem, SetContent, Profile } from '@/lib/types'
import { format } from 'date-fns'
import CameraQRScanner from '@/components/CameraQRScanner'

interface ChecklistItem extends SetContent {
  checked: boolean
  receivedQty: number // editable qty during receiving
}

interface DispensedItem {
  id: string
  item_id: string
  item_name: string
  item_qr_code: string
  or_room: string
  received_by_name: string
  received_by_id: string | null
  dispensed_at: string
}

export default function ReceivingPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  // Dispensed items list
  const [dispensedItems, setDispensedItems] = useState<DispensedItem[]>([])
  const [showDispensedList, setShowDispensedList] = useState(true)
  const [loadingDispensed, setLoadingDispensed] = useState(true)

  // Item being processed
  const [qrInput, setQrInput] = useState('')
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [contents, setContents] = useState<ChecklistItem[]>([])
  const [remarks, setRemarks] = useState('')
  const [missingItems, setMissingItems] = useState('')
  const [shelfLocation, setShelfLocation] = useState('')
  const [editingList, setEditingList] = useState(false)
  const [newInstr, setNewInstr] = useState({ name: '', qty: 1 })

  // Returned-by staff (persists across steps)
  const [returnedByStaff, setReturnedByStaff] = useState<Profile | null>(null)
  const [returnedBySearch, setReturnedBySearch] = useState('')
  const [returnedByResults, setReturnedByResults] = useState<Profile[]>([])
  const [returnedByQr, setReturnedByQr] = useState('')
  const [showReturnCamera, setShowReturnCamera] = useState(false)
  const [showMainCamera, setShowMainCamera] = useState(false)

  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Staff')
  const [userDept, setUserDept] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase.from('profiles').select('full_name, department').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) { setUserName(data.full_name); setUserDept(data.department) }
          else setUserName(user.email?.split('@')[0] || 'Staff')
        })
    })
    loadDispensedItems()

    // Auto-load from URL param (from Inventory "Update" button)
    const preload = searchParams.get('qr')
    if (preload) {
      setQrInput(preload)
      setTimeout(() => lookupItem(preload), 300)
    } else {
      inputRef.current?.focus()
    }
  }, [])

  async function loadDispensedItems() {
    setLoadingDispensed(true)
    // Get all dispensed items with their latest dispense record
    const { data: items } = await supabase
      .from('inventory_items')
      .select('id, name, qr_code, location, updated_at')
      .eq('status', 'dispensed')
      .order('updated_at', { ascending: false })

    if (!items || items.length === 0) { setDispensedItems([]); setLoadingDispensed(false); return }

    // For each item, get the latest dispense record
    const enriched: DispensedItem[] = []
    for (const it of items) {
      const { data: dr } = await supabase
        .from('dispense_records')
        .select('id, received_by_name, received_by_id, or_room, created_at')
        .eq('item_id', it.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      enriched.push({
        id: dr?.id || '',
        item_id: it.id,
        item_name: it.name,
        item_qr_code: it.qr_code,
        or_room: dr?.or_room || it.location || '—',
        received_by_name: dr?.received_by_name || '—',
        received_by_id: dr?.received_by_id || null,
        dispensed_at: dr?.created_at || it.updated_at,
      })
    }
    setDispensedItems(enriched)
    setLoadingDispensed(false)
  }

  async function selectDispensedItem(dispensed: DispensedItem) {
    setShowDispensedList(false)
    setQrInput(dispensed.item_qr_code)
    await lookupItemWithDispense(dispensed.item_qr_code, dispensed)
  }

  async function lookupItem(code: string) {
    if (!code.trim()) return
    // Find the dispense record too
    const { data: items } = await supabase
      .from('inventory_items').select('id').eq('qr_code', code.trim().toUpperCase()).single()
    if (items) {
      const { data: dr } = await supabase
        .from('dispense_records')
        .select('id, received_by_name, received_by_id, or_room, created_at')
        .eq('item_id', items.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (dr) {
        const dispensed: DispensedItem = {
          id: dr.id, item_id: items.id, item_name: '', item_qr_code: code,
          or_room: dr.or_room, received_by_name: dr.received_by_name,
          received_by_id: dr.received_by_id, dispensed_at: dr.created_at,
        }
        await lookupItemWithDispense(code, dispensed)
        return
      }
    }
    await lookupItemWithDispense(code, null)
  }

  async function lookupItemWithDispense(code: string, dispense: DispensedItem | null) {
    setSearching(true); setError(''); setSuccess(''); setItem(null); setContents([])
    setRemarks(''); setMissingItems(''); setShelfLocation(''); setEditingList(false)

    let found: InventoryItem | null = null
    const { data } = await supabase.from('inventory_items').select('*')
      .eq('qr_code', code.trim().toUpperCase()).single()
    if (data) found = data
    if (!found) {
      const { data: d2 } = await supabase.from('inventory_items').select('*')
        .ilike('qr_code', code.trim()).single()
      if (d2) found = d2
    }
    if (!found) { setError(`No item found for "${code.trim()}".`); setSearching(false); return }

    setItem(found)
    setRemarks(found.current_remarks || '')
    setShelfLocation(found.shelf_location || '')

    // Pre-fill returned-by from dispense record
    if (dispense?.received_by_id) {
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', dispense.received_by_id).single()
      if (profile) setReturnedByStaff(profile)
    } else if (dispense?.received_by_name) {
      // Staff exists but no ID — create partial profile object
      setReturnedByStaff({ id: '', full_name: dispense.received_by_name, role: 'or_nurse', department: null, employee_id: null, qr_code: null, avatar_initials: null } as Profile)
    }

    const { data: cList } = await supabase.from('set_contents').select('*')
      .eq('set_id', found.id).order('sort_order')
    setContents((cList || []).map(c => ({ ...c, checked: false, receivedQty: c.quantity })))
    setSearching(false)
  }

  async function searchReturnedBy(q: string) {
    setReturnedBySearch(q)
    if (!q.trim()) { setReturnedByResults([]); return }
    const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${q}%`).limit(5)
    setReturnedByResults(data || [])
  }

  async function lookupReturnedByQr(qr: string) {
    if (!qr.trim()) return
    const { data } = await supabase.from('profiles').select('*').eq('qr_code', qr.trim()).single()
    if (data) { setReturnedByStaff(data); setReturnedByQr(''); setError('') }
    else setError(`No staff found for QR "${qr.trim()}"`)
  }

  function toggleCheck(id: string) {
    setContents(c => c.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
  }
  function checkAll() {
    const allChecked = contents.every(c => c.checked)
    setContents(c => c.map(i => ({ ...i, checked: !allChecked })))
  }

  async function updateReceivedQty(contentId: string, newQty: number, originalQty: number) {
    if (newQty === originalQty) return
    setContents(c => c.map(i => i.id === contentId ? { ...i, receivedQty: newQty } : i))

    const target = contents.find(c => c.id === contentId)
    if (!target || !item) return

    const diff = originalQty - newQty
    if (diff > 0) {
      // Quantity reduced — log audit + create alert
      const note = `Quantity discrepancy: ${target.instrument_name} — expected ${originalQty}, received ${newQty} (missing ${diff})`

      await supabase.from('audit_logs').insert({
        item_id: item.id, item_name: item.name, item_qr_code: item.qr_code,
        action: 'set_contents_updated',
        performed_by_id: userId, performed_by_name: userName,
        department: userDept, location: 'CSSD Receiving Area',
        device_used: 'Web Browser', notes: note,
      })

      await supabase.from('alerts').insert({
        alert_type: 'quantity_discrepancy', severity: 'critical',
        title: `Quantity discrepancy in ${item.name}`,
        body: `${target.instrument_name}: expected ${originalQty}, received ${newQty}. Reported by ${userName}.`,
        item_id: item.id, item_name: item.name,
      })
    }
  }

  async function addInstrument() {
    if (!item || !newInstr.name.trim()) return
    const { data } = await supabase.from('set_contents').insert({
      set_id: item.id, instrument_name: newInstr.name.trim(),
      quantity: newInstr.qty, sort_order: contents.length + 1,
    }).select().single()
    if (data) {
      setContents(c => [...c, { ...data, checked: true, receivedQty: newInstr.qty }])
      await logAudit('set_contents_updated', `Added during receiving: ${newInstr.qty}× ${newInstr.name.trim()}`)
      setNewInstr({ name: '', qty: 1 })
    }
  }

  async function removeInstrument(id: string) {
    const target = contents.find(c => c.id === id)
    await supabase.from('set_contents').delete().eq('id', id)
    setContents(c => c.filter(i => i.id !== id))
    if (target) await logAudit('set_contents_updated', `Removed during receiving: ${target.quantity}× ${target.instrument_name}`)
  }

  async function logAudit(action: string, notes?: string) {
    if (!item || !userId) return
    await supabase.from('audit_logs').insert({
      item_id: item.id, item_name: item.name, item_qr_code: item.qr_code,
      action, performed_by_id: userId, performed_by_name: userName,
      department: userDept, location: 'CSSD Receiving Area',
      device_used: 'Web Browser', notes: notes || null,
    })
  }

  const returnedByLabel = returnedByStaff
    ? `Returned by: ${returnedByStaff.full_name}`
    : `Returned by: ${item?.last_user_name || 'unknown'} (default)`

  // STEP 1 — Receive
  async function markReceived() {
    if (!item || !userId) return
    setLoading(true); setError('')

    const returnNote = returnedByStaff
      ? `Returned by: ${returnedByStaff.full_name}${returnedByStaff.qr_code ? ' (' + returnedByStaff.qr_code + ')' : ''}`
      : `Returned by: ${item.last_user_name || 'unknown'} (default — same staff)`

    await supabase.from('inventory_items').update({
      status: 'received', location: 'CSSD Receiving Area',
      last_user_id: userId, last_user_name: userName,
      current_remarks: remarks || null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    await logAudit('received_at_cssd',
      `${returnNote}. ${remarks || ''}${missingItems ? ' Missing: ' + missingItems : ''}`.trim())

    if (missingItems) {
      await supabase.from('alerts').insert({
        alert_type: 'missing_items', severity: 'critical',
        title: `Missing instruments in ${item.name}`,
        body: `Reported by ${userName} during receiving: ${missingItems}`,
        item_id: item.id, item_name: item.name,
      })
    }
    setSuccess('Set received and inspected ✓'); setLoading(false)
    await lookupItemWithDispense(item.qr_code, null)
  }

  // STEP 2 — Pack
  async function markPacked() {
    if (!item || !userId) return
    setLoading(true); setError('')
    const checked = contents.filter(c => c.checked).length
    const total = contents.length
    const returnNote = returnedByStaff
      ? `Returned by: ${returnedByStaff.full_name}`
      : `Returned by: ${item.last_user_name || 'unknown'} (default)`

    await supabase.from('inspections').insert({
      item_id: item.id, item_name: item.name,
      inspected_by_id: userId, inspected_by_name: userName,
      completeness_passed: checked === total && total > 0,
      functionality_passed: true, cleanliness_passed: true,
      remarks, missing_items: missingItems || null,
    })

    await supabase.from('inventory_items').update({
      status: 'packed', location: 'Sterilization Queue',
      last_user_id: userId, last_user_name: userName,
      current_remarks: remarks || null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    await logAudit('packed_for_sterilization',
      `${returnNote}. Inspection: ${checked}/${total} verified. ${remarks || ''}`.trim())
    setSuccess('Packed and ready for sterilization 🔥'); setLoading(false)
    await lookupItemWithDispense(item.qr_code, null)
  }

  // STEP 3 — Confirm sterile
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
      current_remarks: null, updated_at: now.toISOString(),
    }).eq('id', item.id)

    await logAudit('placed_on_shelf',
      `Sterilization tape verified. Shelf: ${shelfLocation}. ${remarks || ''}`)
    setSuccess(`Verified sterile and placed on ${shelfLocation} ✓`); setLoading(false)
    setTimeout(() => {
      setItem(null); setQrInput(''); setContents([])
      setRemarks(''); setShelfLocation(''); setSuccess('')
      setReturnedByStaff(null)
      loadDispensedItems()
      setShowDispensedList(true)
      inputRef.current?.focus()
    }, 2000)
  }

  function getCurrentStep(): 1 | 2 | 3 {
    if (!item) return 1
    if (item.status === 'received') return 2
    if (item.status === 'packed') return 3
    return 1
  }
  const step = getCurrentStep()

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Inbox size={22} className="text-brand-500" /> CSSD Receiving Area
          </h1>
          <p className="text-sm text-gray-500 mt-1">Select a returned set or scan its QR code</p>
        </div>

        {/* DISPENSED ITEMS LIST */}
        {!item && (
          <div className="card mb-4 overflow-hidden">
            <button
              onClick={() => setShowDispensedList(!showDispensedList)}
              className="w-full flex items-center justify-between px-4 py-3 bg-brand-50 hover:bg-brand-100 transition-colors">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-brand-500" />
                <span className="font-medium text-brand-800 text-sm">
                  Items Currently at OR ({dispensedItems.length})
                </span>
              </div>
              {showDispensedList
                ? <ChevronUp size={16} className="text-brand-500" />
                : <ChevronDown size={16} className="text-brand-500" />}
            </button>

            {showDispensedList && (
              <div>
                {loadingDispensed ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
                ) : dispensedItems.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    No items currently dispensed to OR.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {dispensedItems.map(d => (
                      <button key={d.item_id} onClick={() => selectDispensedItem(d)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800">{d.item_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                            <span className="font-mono">{d.item_qr_code}</span>
                            <span>📍 {d.or_room}</span>
                            <span>👤 {d.received_by_name}</span>
                          </div>
                        </div>
                        <div className="text-xs text-brand-500 font-medium flex-shrink-0">
                          Select →
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* QR scan / manual input */}
        {!item && (
          <div className="card p-5 mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or scan / type QR code directly
            </label>
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupItem(qrInput)}
                placeholder="e.g. MAJOR-001…"
                className="input-field flex-1 text-base font-mono" />
              <button onClick={() => setShowMainCamera(true)} className="btn-secondary px-3" title="Scan with camera">
                <Camera size={16} />
              </button>
              <button onClick={() => lookupItem(qrInput)} disabled={!qrInput.trim() || searching} className="btn-primary px-4">
                {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={15} />}
              </button>
            </div>
          </div>
        )}

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
            {/* Back button + item header */}
            <div className="card p-5 mb-4">
              <button onClick={() => { setItem(null); setQrInput(''); setReturnedByStaff(null); setShowDispensedList(true) }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3">
                ← Back to list
              </button>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package size={22} className="text-brand-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-800 text-lg">{item.name}</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{item.qr_code}</p>
                </div>
              </div>

              {/* Step indicator */}
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
                        <span className="sm:hidden">{s.n}</span>
                      </div>
                      {i < 2 && <ArrowRight size={12} className="text-gray-300 flex-shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step 1 & 2 content */}
            {(step === 1 || step === 2) && (
              <>
                {/* Checklist */}
                <div className="card p-5 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-800 text-sm flex items-center gap-2">
                      <ClipboardCheck size={15} className="text-brand-500" /> Inspection Checklist
                      <span className="text-xs font-normal text-gray-400">
                        ({contents.filter(c => c.checked).length}/{contents.length})
                      </span>
                    </h3>
                    <button onClick={() => setEditingList(!editingList)}
                      className="text-xs text-brand-500 font-medium flex items-center gap-1">
                      {editingList ? <><X size={11} /> Done</> : <><Edit3 size={11} /> Edit List</>}
                    </button>
                  </div>

                  {contents.length === 0 && !editingList && (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">No instruments listed.</p>
                      <button onClick={() => setEditingList(true)} className="text-xs text-brand-500 font-medium mt-1">+ Add instruments</button>
                    </div>
                  )}

                  {contents.length > 0 && (
                    <>
                      {!editingList && (
                        <button onClick={checkAll} className="text-xs text-brand-500 font-medium mb-2">
                          {contents.every(c => c.checked) ? 'Uncheck all' : 'Check all'}
                        </button>
                      )}
                      <div className="space-y-1.5 max-h-80 overflow-y-auto">
                        {contents.map(c => (
                          <div key={c.id} className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors ${
                            editingList ? 'bg-blue-50 border border-blue-100' : c.checked ? 'bg-green-50' : 'bg-white border border-gray-100'
                          }`}>
                            {!editingList && (
                              <input type="checkbox" checked={c.checked} onChange={() => toggleCheck(c.id)}
                                className="w-5 h-5 rounded text-brand-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 text-sm text-gray-700">{c.instrument_name}</div>

                            {editingList ? (
                              // Editable quantity in edit mode
                              <div className="flex items-center gap-1.5">
                                <label className="text-xs text-gray-400">Rcvd:</label>
                                <input
                                  type="number" min={0} max={c.quantity}
                                  value={c.receivedQty}
                                  onChange={e => {
                                    const newQty = parseInt(e.target.value) || 0
                                    updateReceivedQty(c.id, newQty, c.quantity)
                                  }}
                                  className="w-16 text-center text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-brand-400 focus:outline-none"
                                />
                                <span className="text-xs text-gray-400">/ {c.quantity}</span>
                                {c.receivedQty < c.quantity && (
                                  <span className="text-xs text-red-500 font-medium">
                                    -{c.quantity - c.receivedQty}
                                  </span>
                                )}
                                <button onClick={() => removeInstrument(c.id)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove">
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                ×{c.receivedQty}
                                {c.receivedQty < c.quantity && (
                                  <span className="text-red-500 ml-1">(of {c.quantity})</span>
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {editingList && (
                    <div className="mt-3 flex gap-2 items-end border-t border-blue-100 pt-3">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 mb-1 block">New instrument</label>
                        <input type="text" value={newInstr.name}
                          onChange={e => setNewInstr({...newInstr, name: e.target.value})}
                          onKeyDown={e => e.key === 'Enter' && addInstrument()}
                          placeholder='e.g. Allis Forceps' className="input-field" />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                        <input type="number" min={1} value={newInstr.qty}
                          onChange={e => setNewInstr({...newInstr, qty: parseInt(e.target.value) || 1})}
                          className="input-field" />
                      </div>
                      <button onClick={addInstrument} disabled={!newInstr.name.trim()} className="btn-primary px-3 py-2">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Remarks + Returned By */}
                <div className="card p-5 mb-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Remarks */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Remarks <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
                          placeholder="Condition notes, functionality issues…"
                          rows={3} className="input-field resize-none text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Missing Items <span className="text-gray-400 font-normal">(if any)</span>
                        </label>
                        <input type="text" value={missingItems} onChange={e => setMissingItems(e.target.value)}
                          placeholder="e.g. 1× Allis Forceps missing"
                          className="input-field text-sm" />
                        {missingItems && <p className="text-xs text-amber-600 mt-1">⚠ Alert will be created.</p>}
                      </div>
                    </div>

                    {/* Returned By */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Returned by
                      </label>

                      {/* Show carry-over note in Pack step */}
                      {step === 2 && returnedByStaff && (
                        <div className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1.5 mb-2 flex items-center gap-1.5">
                          ✓ Carried over from Receive step
                        </div>
                      )}

                      {!returnedByStaff ? (
                        <div className="space-y-2">
                          {item.last_user_name && (
                            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                              <User size={11} /> Default: <strong>{item.last_user_name}</strong>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <input type="text" value={returnedByQr}
                              onChange={e => setReturnedByQr(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && lookupReturnedByQr(returnedByQr)}
                              placeholder="Scan staff QR…"
                              className="input-field flex-1 font-mono text-sm" />
                            <button onClick={() => setShowReturnCamera(true)}
                              className="btn-secondary px-3" title="Scan with camera">
                              <Camera size={14} />
                            </button>
                          </div>
                          <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={returnedBySearch}
                              onChange={e => searchReturnedBy(e.target.value)}
                              placeholder="Or search by name…"
                              className="input-field pl-8 text-sm" />
                            {returnedByResults.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                                {returnedByResults.map(s => (
                                  <button key={s.id}
                                    onClick={() => { setReturnedByStaff(s); setReturnedBySearch(''); setReturnedByResults([]) }}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm">
                                    <div className="font-medium text-gray-700">{s.full_name}</div>
                                    <div className="text-xs text-gray-400 capitalize">{s.role?.replace(/_/g,' ')}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                          <User size={14} className="text-blue-500 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-800">{returnedByStaff.full_name}</div>
                            <div className="text-xs text-gray-500 capitalize">{returnedByStaff.role?.replace(/_/g,' ')}</div>
                          </div>
                          {step === 1 && (
                            <button onClick={() => setReturnedByStaff(null)} className="text-gray-400 hover:text-gray-600">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Shelf location */}
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
                      }`}>{s}</button>
                  ))}
                </div>
                <input type="text" value={shelfLocation} onChange={e => setShelfLocation(e.target.value)}
                  placeholder="Or type custom shelf…" className="input-field text-sm" />
              </div>
            )}

            {/* Action buttons */}
            <div className="mb-4">
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

        {/* Camera scanners */}
        {showMainCamera && (
          <CameraQRScanner label="Scan Instrument Set QR"
            onScan={(code) => { setShowMainCamera(false); setQrInput(code); lookupItem(code) }}
            onClose={() => setShowMainCamera(false)} />
        )}
        {showReturnCamera && (
          <CameraQRScanner label="Scan Staff QR Badge"
            onScan={(code) => { setShowReturnCamera(false); lookupReturnedByQr(code) }}
            onClose={() => setShowReturnCamera(false)} />
        )}
      </div>
    </AppLayout>
  )
}
