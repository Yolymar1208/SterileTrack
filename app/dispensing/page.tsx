'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Send, Package, Search, X, QrCode, Printer, Loader2, CheckCircle2, User, MapPin } from 'lucide-react'
import { InventoryItem, Profile, SetContent } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'
import Link from 'next/link'

const OR_ROOMS = ['OR 1', 'OR 2', 'OR 3', 'OR 4', 'OR 5', 'Minor OR', 'Recovery', 'ICU']

export default function DispensingPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  useEffect(() => { load() }, [])
  async function load() {
    const { data } = await supabase.from('inventory_items')
      .select('*').eq('status', 'sterile').order('shelf_location')
    setItems(data || []); setLoading(false)
  }

  const filtered = items.filter(i => !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.qr_code.toLowerCase().includes(search.toLowerCase()) ||
    (i.shelf_location || '').toLowerCase().includes(search.toLowerCase()))

  const shelves = filtered.reduce((acc, item) => {
    const s = item.shelf_location || 'Unassigned'
    if (!acc[s]) acc[s] = []
    acc[s].push(item)
    return acc
  }, {} as Record<string, InventoryItem[]>)

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Send size={22} className="text-brand-500" /> CSSD Dispensing Area
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dispense sterile sets to OR staff — scan staff QR for accountability
          </p>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search sterile items, QR code, or shelf…"
              className="input-field pl-9" />
          </div>
        </div>

        {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div>
        : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">No sterile items available</p>
            <p className="text-sm text-gray-400 mt-1">Items must be sterilized in the Receiving Area first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(shelves).sort().map(([shelf, shelfItems]) => (
              <div key={shelf} className="card overflow-hidden">
                <div className="bg-teal-50 border-b border-teal-100 px-4 py-2.5 flex items-center gap-2">
                  <MapPin size={14} className="text-teal-600" />
                  <span className="font-medium text-teal-800 text-sm">{shelf}</span>
                  <span className="ml-auto text-xs text-teal-600 font-medium">{shelfItems.length}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {shelfItems.map(item => {
                    const days = item.expiry_date ? differenceInDays(new Date(item.expiry_date), new Date()) : null
                    const expiring = days !== null && days <= 7
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Package size={16} className="text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/inventory/${item.id}`} className="text-sm font-medium text-gray-800 hover:text-brand-500">
                            {item.name}
                          </Link>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400 font-mono">{item.qr_code}</span>
                            {days !== null && (
                              <span className={`text-xs ${expiring ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                                {days <= 0 ? 'Expired' : `${days}d left`}
                              </span>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setSelectedItem(item)}
                          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <Send size={13} /> Dispense
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedItem && (
          <DispenseModal item={selectedItem} onClose={() => setSelectedItem(null)} onDispensed={() => { setSelectedItem(null); load() }} />
        )}
      </div>
    </AppLayout>
  )
}

function DispenseModal({ item, onClose, onDispensed }: {
  item: InventoryItem; onClose: () => void; onDispensed: () => void
}) {
  const supabase = createClient()
  const [staffQr, setStaffQr] = useState('')
  const [receivingStaff, setReceivingStaff] = useState<Profile | null>(null)
  const [staffSearchResults, setStaffSearchResults] = useState<Profile[]>([])
  const [staffSearch, setStaffSearch] = useState('')
  const [orRoom, setOrRoom] = useState(OR_ROOMS[0])
  const [remarks, setRemarks] = useState('')
  const [contents, setContents] = useState<SetContent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('set_contents').select('*').eq('set_id', item.id).order('sort_order')
      .then(({ data }) => setContents(data || []))
  }, [item.id])

  async function lookupStaffByQr(qr: string) {
    if (!qr.trim()) return
    const { data } = await supabase.from('profiles').select('*').eq('qr_code', qr.trim().toUpperCase()).single()
    if (data) { setReceivingStaff(data); setStaffQr(''); setError('') }
    else setError(`No staff found for QR "${qr.trim()}"`)
  }

  async function searchStaffByName(q: string) {
    setStaffSearch(q)
    if (!q.trim()) { setStaffSearchResults([]); return }
    const { data } = await supabase.from('profiles').select('*').ilike('full_name', `%${q}%`).limit(5)
    setStaffSearchResults(data || [])
  }

  function openPrintList() {
    window.open(`/sets/${item.id}/print?or=${encodeURIComponent(orRoom)}&staff=${encodeURIComponent(receivingStaff?.full_name || '')}`, '_blank')
  }

  async function handleDispense() {
    if (!receivingStaff) { setError('Please scan or select the receiving staff'); return }
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { data: dispProfile } = await supabase.from('profiles').select('full_name, department').eq('id', user!.id).single()
    const dispName = dispProfile?.full_name || user?.email?.split('@')[0] || 'Staff'

    const contentsText = contents.map(c => `${c.quantity}× ${c.instrument_name}`).join('; ')

    await supabase.from('inventory_items').update({
      status: 'dispensed', location: orRoom,
      last_user_id: user!.id, last_user_name: dispName,
      current_remarks: null,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    await supabase.from('dispense_records').insert({
      item_id: item.id, item_name: item.name, item_qr_code: item.qr_code,
      dispensed_by_id: user!.id, dispensed_by_name: dispName,
      received_by_id: receivingStaff.id, received_by_name: receivingStaff.full_name,
      received_by_qr: receivingStaff.qr_code, or_room: orRoom,
      remarks: remarks || null, contents_snapshot: contentsText,
    })

    await supabase.from('audit_logs').insert({
      item_id: item.id, item_name: item.name, item_qr_code: item.qr_code,
      action: 'dispensed_to_or', performed_by_id: user!.id,
      performed_by_name: dispName, department: dispProfile?.department,
      location: orRoom, device_used: 'Web Browser',
      notes: `Received by ${receivingStaff.full_name}. ${remarks || ''}`.trim(),
    })

    setLoading(false)
    onDispensed()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-800">Dispense {item.name}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{item.qr_code} · {item.shelf_location}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Receiving Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Receiving Staff <span className="text-red-400">*</span>
            </label>
            {!receivingStaff ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="text" value={staffQr}
                    onChange={e => setStaffQr(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && lookupStaffByQr(staffQr)}
                    placeholder="Scan staff badge QR (e.g. STAFF-001)"
                    className="input-field flex-1 font-mono text-sm" />
                  <button onClick={() => lookupStaffByQr(staffQr)} disabled={!staffQr.trim()}
                    className="btn-primary px-3 text-sm">
                    <QrCode size={14} />
                  </button>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={staffSearch}
                    onChange={e => searchStaffByName(e.target.value)}
                    placeholder="Or search staff by name…"
                    className="input-field pl-9 text-sm" />
                  {staffSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                      {staffSearchResults.map(s => (
                        <button key={s.id} onClick={() => { setReceivingStaff(s); setStaffSearch(''); setStaffSearchResults([]) }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                          <div className="w-7 h-7 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 text-xs font-bold">
                            {s.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-700">{s.full_name}</div>
                            <div className="text-xs text-gray-400">{s.role.replace(/_/g, ' ')} · {s.department || 'No dept'}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-brand-50 border border-brand-200 rounded-xl px-3 py-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-bold">
                  {receivingStaff.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 text-sm">{receivingStaff.full_name}</div>
                  <div className="text-xs text-gray-500">
                    {receivingStaff.role.replace(/_/g, ' ')}
                    {receivingStaff.department && ` · ${receivingStaff.department}`}
                    {receivingStaff.qr_code && ` · ${receivingStaff.qr_code}`}
                  </div>
                </div>
                <button onClick={() => setReceivingStaff(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* OR Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {OR_ROOMS.map(r => (
                <button key={r} onClick={() => setOrRoom(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    orRoom === r ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)}
              rows={2} placeholder="Notes for this dispensing…"
              className="input-field resize-none text-sm" />
          </div>

          {/* Contents preview */}
          {contents.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs font-medium text-gray-600 mb-2">
                Contents ({contents.length} item types):
              </div>
              <div className="text-xs text-gray-500 space-y-0.5 max-h-32 overflow-y-auto">
                {contents.map(c => (
                  <div key={c.id}>• {c.quantity}× {c.instrument_name}</div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            <button onClick={openPrintList} disabled={contents.length === 0}
              className="btn-secondary px-4 py-2.5 text-sm">
              <Printer size={14} /> Print List
            </button>
            <button onClick={handleDispense} disabled={!receivingStaff || loading}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirm Dispense</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
