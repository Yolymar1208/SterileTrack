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
  const [filtered, setFiltered] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!search) { setFiltered(items); return }
    const q = search.toLowerCase()
    setFiltered(items.filter(i => i.name.toLowerCase().includes(q) || (i.shelf_location || '').toLowerCase().includes(q) || i.qr_code.toLowerCase().includes(q)))
  }, [search, items])

  async function load() {
    const { data } = await supabase.from('inventory_items').select('*').eq('status', 'sterile').order('shelf_location')
    setItems(data || []); setFiltered(data || []); setLoading(false)
  }

  // Group by shelf
  const shelves = filtered.reduce((acc, item) => {
    const shelf = item.shelf_location || 'Unassigned'
    if (!acc[shelf]) acc[shelf] = []
    acc[shelf].push(item)
    return acc
  }, {} as Record<string, InventoryItem[]>)

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Archive size={22} className="text-teal-500" /> Storage</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} sterile items in storage</p>
          </div>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, shelf, QR code…" className="input-field pl-9" />
          </div>
        </div>

        {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div>
        : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Archive size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">No sterile items in storage</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(shelves).sort().map(([shelf, shelfItems]) => (
              <div key={shelf} className="card overflow-hidden">
                <div className="bg-teal-50 border-b border-teal-100 px-4 py-2.5 flex items-center gap-2">
                  <MapPin size={14} className="text-teal-600" />
                  <span className="font-medium text-teal-800 text-sm">{shelf}</span>
                  <span className="ml-auto text-xs text-teal-600 font-medium">{shelfItems.length} item{shelfItems.length > 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {shelfItems.map(item => {
                    const daysLeft = item.expiry_date ? differenceInDays(new Date(item.expiry_date), new Date()) : null
                    const expiringSoon = daysLeft !== null && daysLeft <= 7
                    return (
                      <Link key={item.id} href={`/inventory/${item.id}`}>
                        <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                          <Package size={16} className="text-teal-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-700">{item.name}</div>
                            <div className="text-xs text-gray-400 font-mono">{item.qr_code}</div>
                          </div>
                          {item.expiry_date && (
                            <div className={`text-right flex-shrink-0 ${expiringSoon ? 'text-red-600' : 'text-gray-400'}`}>
                              <div className="text-xs flex items-center gap-1 justify-end">
                                <Calendar size={10} />
                                {daysLeft !== null && daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                              </div>
                              <div className="text-xs">{format(new Date(item.expiry_date), 'MMM d')}</div>
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
