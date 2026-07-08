'use client'

import { useHospitalSlug } from '@/lib/hospital'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Package, ChevronRight, RefreshCw } from 'lucide-react'
import { InventoryItem, STATUS_CONFIG, ItemStatus, ItemType } from '@/lib/types'

const STATUS_FILTERS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Items' },
  { value: 'sterile', label: 'Sterile' },
  { value: 'received', label: 'Received' },
  { value: 'packed', label: 'Packed' },
  { value: 'dispensed', label: 'At OR' },
  { value: 'missing', label: 'Missing' },
  { value: 'damaged', label: 'Damaged' },
]

export default function InventoryPage() {
  const supabase = createClient()
  const slug = useHospitalSlug()
  const router = useRouter()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filtered, setFiltered] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [confirmUpdateId, setConfirmUpdateId] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setCurrentUser({ id: user.id, name: data?.full_name || user.email?.split('@')[0] || 'Staff' }))
    })
    loadItems()
  }, [])

  useEffect(() => {
    let result = items
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.qr_code.toLowerCase().includes(q) ||
        (i.location || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [items, search, statusFilter])

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase.from('inventory_items').select('*').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function handleUpdate(item: InventoryItem) {
    if (!currentUser) return
    setUpdating(true)

    await supabase.from('inventory_items').update({
      status: 'received',
      location: 'CSSD Receiving Area',
      last_user_id: currentUser.id,
      last_user_name: currentUser.name,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    await supabase.from('audit_logs').insert({
      item_id: item.id,
      item_name: item.name,
      item_qr_code: item.qr_code,
      action: 'received_at_cssd',
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.name,
      location: 'CSSD Receiving Area',
      device_used: 'Web Browser',
      notes: `Set marked unsterile and sent to Receiving for contents update by ${currentUser.name}`,
    })

    setUpdating(false)
    setConfirmUpdateId(null)
    // Redirect to receiving with QR pre-loaded
    router.push(`/${slug}/receiving?qr=${encodeURIComponent(item.qr_code)}&returnedById=${encodeURIComponent(currentUser.id)}`)
  }

  return (
    <>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package size={22} className="text-brand-500" /> Inventory
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} total items</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm px-3 py-2">
            <Plus size={15} /> Add Item
          </button>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, QR code, location…" className="input-field pl-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === f.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}>
                {f.label}
                {f.value !== 'all' && (
                  <span className="ml-1.5 opacity-70">
                    {items.filter(i => i.status === f.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="card divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <p className="font-medium text-gray-600 text-sm">No items found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different status filter</p>
            </div>
          ) : filtered.map(item => {
            const cfg = STATUS_CONFIG[item.status]
            const isExpiringSoon = item.expiry_date &&
              new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
              item.status !== 'expired'
            const isSterile = item.status === 'sterile'

            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={17} className="text-brand-500" />
                </div>
                <Link href={`/inventory/${item.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    {isExpiringSoon && (
                      <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex-shrink-0">
                        Expires soon
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400 font-mono">{item.qr_code}</span>
                    {item.location && <span className="text-xs text-gray-400">{item.location}</span>}
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cfg && (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  )}
                  {/* Update button — only for Sterile items */}
                  {isSterile && (
                    <button
                      onClick={() => setConfirmUpdateId(item.id)}
                      className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      title="Mark as unsterile and send to Receiving">
                      <RefreshCw size={11} /> Update
                    </button>
                  )}
                  <Link href={`/inventory/${item.id}`}>
                    <ChevronRight size={15} className="text-gray-300" />
                  </Link>
                </div>

                {/* Confirm Update Dialog */}
                {confirmUpdateId === item.id && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
                      <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <RefreshCw size={26} className="text-amber-600" />
                      </div>
                      <h3 className="font-semibold text-gray-800 text-lg mb-2">Update {item.name}?</h3>
                      <p className="text-sm text-gray-500 mb-1">
                        This will mark the set as <strong>unsterile</strong> and send it to the Receiving Area.
                      </p>
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-5">
                        Opening a sterile pack makes it unsterile. It must go through receiving and re-sterilization before use.
                      </p>
                      <div className="flex gap-3">
                        <button onClick={() => setConfirmUpdateId(null)}
                          className="btn-secondary flex-1 justify-center">
                          Cancel
                        </button>
                        <button onClick={() => handleUpdate(item)} disabled={updating}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                          {updating ? <><RefreshCw size={14} className="animate-spin" /> Sending…</> : '→ Send to Receiving'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onSaved={loadItems} />}
      </div>
    </>
  )
}

function AddItemModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const supabase = createClient()
  const [form, setForm] = useState({
    name: '', qr_code: '', item_type: 'instrument_set' as ItemType,
    description: '', location: '', shelf_location: '', expiry_date: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!form.name || !form.qr_code) { setError('Name and QR Code are required'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
    const { data: newItem, error: err } = await supabase.from('inventory_items').insert({
      ...form, expiry_date: form.expiry_date || null, status: 'sterile',
    }).select().single()
    if (err) { setError(err.message); setLoading(false); return }
    await supabase.from('audit_logs').insert({
      item_id: newItem.id, item_name: newItem.name, item_qr_code: newItem.qr_code,
      action: 'created',
      performed_by_id: user!.id,
      performed_by_name: profile?.full_name || user?.email?.split('@')[0] || 'Staff',
      device_used: 'Web Browser',
    })
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Add New Item</h2>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          {[
            { key: 'name', label: 'Item Name *', placeholder: 'e.g. Major Set 001' },
            { key: 'qr_code', label: 'QR Code *', placeholder: 'e.g. MAJOR-003', mono: true },
            { key: 'description', label: 'Description', placeholder: 'Brief description…' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className={`input-field ${(f as any).mono ? 'font-mono' : ''}`} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shelf Location</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {[
                'Sterile Room Shelf A','Sterile Room Shelf B','Sterile Room Shelf C',
                'Sterile Room Shelf D','Sterile Room Shelf E','Sterile Room Shelf F',
                'Sterile Room Shelf G','Sterile Room Shelf H','Sterile Room Shelf I',
                'Sterile Room Shelf J'
              ].map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, shelf_location: s, location: 'Storage' }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.shelf_location === s
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <input type="text" value={form.shelf_location}
              onChange={e => setForm(f => ({ ...f, shelf_location: e.target.value, location: 'Storage' }))}
              placeholder="Or type a custom shelf location…"
              className="input-field text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
            <select value={form.item_type} onChange={e => setForm(f => ({ ...f, item_type: e.target.value as ItemType }))} className="input-field">
              <option value="instrument_set">Instrument Set</option>
              <option value="sterile_pack">Sterile Pack</option>
              <option value="implant">Implant</option>
              <option value="consumable">Consumable</option>
              <option value="equipment">Equipment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input type="date" value={form.expiry_date}
              onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? 'Saving…' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  )
}
