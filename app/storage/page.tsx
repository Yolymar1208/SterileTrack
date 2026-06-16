'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Archive, Package, Search, MapPin, Calendar } from 'lucide-react'
import Link from 'next/link'
import { InventoryItem } from '@/lib/types'
import { format, differenceInDays } from 'date-fns'

export default function StoragePage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('inventory_items').select('*').eq('status', 'sterile').order('shelf_location')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [])

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
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="input-field pl-9" />
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
                    return (
                      <Link key={item.id} href={`/inventory/${item.id}`}>
                        <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <Package size={16} className="text-teal-500" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700">{item.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{item.qr_code}</div>
                          </div>
                          {days !== null && (
                            <div className={`text-right ${expiring ? 'text-red-600' : 'text-gray-400'}`}>
                              <div className="text-xs flex items-center gap-1 justify-end"><Calendar size={10} /> {days <= 0 ? 'Expired' : `${days}d left`}</div>
                              <div className="text-xs">{format(new Date(item.expiry_date!), 'MMM d')}</div>
                            </div>
                          )}
                        </div>
                      </Link>
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
