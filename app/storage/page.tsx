'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Archive, Package, Search, MapPin, Calendar, Edit2, Save, X } from 'lucide-react'
import Link from 'next/link'
import { InventoryItem } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'

export default function StoragePage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLocation, setEditLocation] = useState({ location: '', shelf_location: '' })
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setCurrentUser({ id: user.id, name: data?.full_name || user.email?.split('@')[0] || 'Staff' }))
    })
    load()
  }, [])

  async function load() {
    const { data } = await supabase.from('inventory_items').select('*').eq('status', 'sterile').order('shelf_location')
    setItems(data || [])
    setLoading(false)
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id)
    setEditLocation({ location: item.location || '', shelf_location: item.shelf_location || '' })
  }

  async function saveLocation(item: InventoryItem) {
    setSaving(true)
    await supabase.from('inventory_items').update({
      location: editLocation.location,
      shelf_location: editLocation.shelf_location,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    // Log the change
    if (currentUser) {
      await supabase.from('audit_logs').insert({
        item_id: item.id,
        item_name: item.name,
        item_qr_code: item.qr_code,
        action: 'updated',
        performed_by_id: currentUser.id,
        performed_by_name: currentUser.name,
        location: editLocation.shelf_location || editLocation.location,
        device_used: 'Web Browser',
        notes: `Storage location updated: ${editLocation.location} · Shelf: ${editLocation.shelf_location}`,
      })
    }

    setSaving(false)
    setEditingId(null)
    load()
  }

  const COMMON_SHELVES = ['Shelf A1','Shelf A2','Shelf B1','Shelf B2','Shelf C1','Shelf C2','Shelf D1','Shelf D2']

  const filtered = items.filter(i => !search ||
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.shelf_location || '').toLowerCase().includes(search.toLowerCase()) ||
    i.qr_code.toLowerCase().includes(search.toLowerCase()))

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
            <Archive size={22} className="text-teal-500" /> Storage Shelf
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} sterile items in storage</p>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, shelf, QR code…" className="input-field pl-9" />
          </div>
        </div>

        {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div>
        : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Archive size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">No items in storage</p>
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
                    const isEditing = editingId === item.id

                    return (
                      <div key={item.id}>
                        {isEditing ? (
                          <div className="px-4 py-3 bg-blue-50 space-y-2">
                            <p className="text-xs font-medium text-gray-700">Edit location for <strong>{item.name}</strong></p>
                            <div className="flex gap-2 flex-wrap mb-1">
                              {COMMON_SHELVES.map(s => (
                                <button key={s} onClick={() => setEditLocation({...editLocation, shelf_location: s})}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                    editLocation.shelf_location === s ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-600 border-gray-200'
                                  }`}>
                                  {s}
                                </button>
                              ))}
                            </div>
                            <input type="text" value={editLocation.shelf_location}
                              onChange={e => setEditLocation({...editLocation, shelf_location: e.target.value})}
                              placeholder="Or type shelf location…" className="input-field text-sm" />
                            <input type="text" value={editLocation.location}
                              onChange={e => setEditLocation({...editLocation, location: e.target.value})}
                              placeholder="Storage area (e.g. Storage Room A)" className="input-field text-sm" />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">
                                <X size={12} /> Cancel
                              </button>
                              <button onClick={() => saveLocation(item)} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
                                {saving ? 'Saving…' : <><Save size={12} /> Save Location</>}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                            <Package size={16} className="text-teal-500 flex-shrink-0" />
                            <Link href={`/inventory/${item.id}`} className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-700 hover:text-brand-500 transition-colors">{item.name}</div>
                              <div className="text-xs text-gray-400 font-mono">{item.qr_code}</div>
                            </Link>
                            {days !== null && (
                              <div className={`text-right flex-shrink-0 ${expiring ? 'text-red-600' : 'text-gray-400'}`}>
                                <div className="text-xs flex items-center gap-1 justify-end">
                                  <Calendar size={10} />
                                  {days <= 0 ? 'Expired' : `${days}d left`}
                                </div>
                                <div className="text-xs">{format(new Date(item.expiry_date!), 'MMM d')}</div>
                              </div>
                            )}
                            <button onClick={() => startEdit(item)}
                              className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors flex-shrink-0" title="Edit location">
                              <Edit2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
