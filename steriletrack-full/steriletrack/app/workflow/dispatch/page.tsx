'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Truck, Package, QrCode, Search, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { InventoryItem } from '@/lib/types'

export default function DispatchPage() {
  const supabase = createClient()
  const [sterileItems, setSterileItems] = useState<InventoryItem[]>([])
  const [inOrItems, setInOrItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [dispatchingId, setDispatchingId] = useState<string | null>(null)
  const [orRoom, setOrRoom] = useState('OR 1')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: sterile } = await supabase.from('inventory_items').select('*').eq('status', 'sterile').order('name')
    const { data: inOr } = await supabase.from('inventory_items').select('*').eq('status', 'in_or').order('updated_at', { ascending: false })
    setSterileItems(sterile || []); setInOrItems(inOr || []); setLoading(false)
  }

  async function dispatchToOR(item: InventoryItem) {
    setDispatchingId(item.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, department').eq('id', user!.id).single()
    const name = profile?.full_name || user?.email?.split('@')[0] || 'Staff'
    await supabase.from('inventory_items').update({ status: 'in_or', location: orRoom, last_user_id: user!.id, last_user_name: name, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('audit_logs').insert({ item_id: item.id, item_name: item.name, item_qr_code: item.qr_code, action: 'released_to_or', performed_by_id: user!.id, performed_by_name: name, department: profile?.department, location: orRoom, device_used: 'Web Browser' })
    setDispatchingId(null); setSelectedItem(null); load()
  }

  const filtered = sterileItems.filter(i => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.qr_code.toLowerCase().includes(search.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Truck size={22} className="text-blue-500" /> Dispatch to OR</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sterileItems.length} sterile items ready · {inOrItems.length} currently in OR</p>
          </div>
          <Link href="/scan" className="btn-primary text-sm px-3 py-2"><QrCode size={14} /> Quick Scan</Link>
        </div>

        {/* Currently in OR */}
        {inOrItems.length > 0 && (
          <div className="card p-4 mb-4 border-blue-100 bg-blue-50">
            <h3 className="font-medium text-blue-800 text-sm mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" /> Currently in OR ({inOrItems.length})
            </h3>
            <div className="space-y-2">
              {inOrItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5">
                  <Package size={15} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-700 truncate">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.location}</div>
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">In OR</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OR room selector */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Dispatching to:</label>
          <div className="flex gap-2 flex-wrap">
            {['OR 1','OR 2','OR 3','OR 4','OR 5','ICU','Recovery'].map(room => (
              <button key={room} onClick={() => setOrRoom(room)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${orRoom === room ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
                {room}
              </button>
            ))}
          </div>
        </div>

        {/* Search sterile items */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sterile items to dispatch…" className="input-field pl-9" />
        </div>

        {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div>
        : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle2 size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">No sterile items available</p>
            <p className="text-sm text-gray-400 mt-1">All items are currently in use or in the workflow.</p>
          </div>
        ) : (
          <div className="card divide-y divide-gray-50">
            {filtered.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={17} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800">{item.name}</div>
                  <div className="text-xs text-gray-400">{item.shelf_location || item.location} · <span className="font-mono">{item.qr_code}</span></div>
                </div>
                <button onClick={() => dispatchToOR(item)} disabled={dispatchingId === item.id}
                  className="btn-primary text-xs px-3 py-2 flex-shrink-0">
                  {dispatchingId === item.id ? <Loader2 size={13} className="animate-spin" /> : <><ArrowRight size={13} /> {orRoom}</>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
