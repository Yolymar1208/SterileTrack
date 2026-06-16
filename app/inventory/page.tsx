'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Search, Plus, Package, Filter, ChevronRight, QrCode } from 'lucide-react'
import { InventoryItem, STATUS_CONFIG, ItemStatus, ItemType } from '@/lib/types'
import { format } from 'date-fns'

const STATUS_FILTERS: { value: ItemStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Items' },
  { value: 'sterile', label: 'Sterile' },
  { value: 'in_or', label: 'In OR' },
  { value: 'decontamination', label: 'Decontamination' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'sterilization', label: 'Sterilization' },
  { value: 'missing', label: 'Missing' },
  { value: 'damaged', label: 'Damaged' },
]

export default function InventoryPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [filtered, setFiltered] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => { loadItems() }, [])

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
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name')
    setItems(data || [])
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Package size={22} className="text-brand-500" /> Inventory
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} total items</p>
          </div>
          <div className="flex gap-2">
            <Link href="/scan" className="btn-secondary text-sm px-3 py-2">
              <QrCode size={14} /> Scan
            </Link>
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm px-3 py-2">
              <Plus size={15} /> Add Item
            </button>
          </div>
        </div>

        {/* Search and filter */}
        <div className="card p-4 mb-4">
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, QR code, location…"
              className="input-field pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === f.value
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
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

        {/* Items list */}
        <div className="card divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Loading inventory…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">No items found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filter</p>
            </div>
          ) : filtered.map(item => {
            const cfg = STATUS_CONFIG[item.status]
            const isExpiringSoon = item.expiry_date &&
              new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) &&
              item.status !== 'expired'
            return (
              <Link key={item.id} href={`/inventory/${item.id}`}>
                <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={17} className="text-brand-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      {isExpiringSoon && (
                        <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Expires soon</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400 font-mono">{item.qr_code}</span>
                      {item.location && <span className="text-xs text-gray-400">{item.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full status-${item.status}`}>
                      {cfg.label}
                    </span>
                    <ChevronRight size={15} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Add Item Modal */}
        {showAddModal && <AddItemModal onClose={() => setShowAddModal(false)} onSaved={loadItems} />}
      </div>
    </AppLayout>
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
      ...form,
      expiry_date: form.expiry_date || null,
      status: 'storage',
    }).select().single()

    if (err) { setError(err.message); setLoading(false); return }

    await supabase.from('audit_logs').insert({
      item_id: newItem.id,
      item_name: newItem.name,
      item_qr_code: newItem.qr_code,
      action: 'created',
      performed_by_id: user!.id,
      performed_by_name: profile?.full_name || 'Unknown',
      device_used: 'Web Browser',
    })

    onSaved()
    onClose()
  }

  const field = (key: keyof typeof form, label: string, type = 'text', extra?: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="input-field"
        {...extra}
      />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Add New Item</h2>
          <p className="text-sm text-gray-500 mt-0.5">Register a new item in the CSSD inventory</p>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          {field('name', 'Item Name *', 'text', { placeholder: 'e.g. Major Set 001' })}
          {field('qr_code', 'QR Code *', 'text', { placeholder: 'e.g. MAJOR-003', className: 'input-field font-mono' })}
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
          {field('description', 'Description', 'text', { placeholder: 'Brief description…' })}
          {field('location', 'Location', 'text', { placeholder: 'e.g. Storage, OR 1' })}
          {field('shelf_location', 'Shelf Location', 'text', { placeholder: 'e.g. Shelf A1' })}
          {field('expiry_date', 'Expiry Date', 'date')}
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
