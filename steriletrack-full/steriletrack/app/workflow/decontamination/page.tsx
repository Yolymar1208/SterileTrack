'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Droplets, QrCode, Package, ChevronRight, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { InventoryItem, STATUS_CONFIG } from '@/lib/types'
import { format, differenceInMinutes } from 'date-fns'

export default function DecontaminationPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('status', 'decontamination')
      .order('updated_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  async function moveToAssembly(item: InventoryItem) {
    setMovingId(item.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, department').eq('id', user!.id).single()

    await supabase.from('inventory_items').update({
      status: 'assembly',
      location: 'Assembly Room',
      last_user_id: user!.id,
      last_user_name: profile?.full_name,
      updated_at: new Date().toISOString(),
    }).eq('id', item.id)

    await supabase.from('audit_logs').insert({
      item_id: item.id,
      item_name: item.name,
      item_qr_code: item.qr_code,
      action: 'received_in_assembly',
      performed_by_id: user!.id,
      performed_by_name: profile?.full_name || '',
      department: profile?.department,
      location: 'Assembly Room',
      device_used: 'Web Browser',
    })

    setMovingId(null)
    load()
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Droplets size={22} className="text-yellow-500" /> Decontamination
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} items currently in decontamination</p>
          </div>
          <Link href="/scan" className="btn-primary text-sm px-3 py-2">
            <QrCode size={14} /> Scan In
          </Link>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <Droplets size={40} className="text-yellow-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Decontamination queue is clear! 🎉</p>
            <p className="text-sm text-gray-400 mt-1">No items currently in decontamination.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const minutesIn = differenceInMinutes(new Date(), new Date(item.updated_at))
              const isDelayed = minutesIn > 120
              return (
                <div key={item.id} className={`card p-4 border ${isDelayed ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{item.qr_code}</div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDelayed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {isDelayed ? '⚠ ' : ''}{minutesIn < 60 ? `${minutesIn}min` : `${Math.floor(minutesIn/60)}h ${minutesIn%60}min`} in decon
                        </span>
                        <span className="text-xs text-gray-400">
                          Since {format(new Date(item.updated_at), 'h:mm a')}
                        </span>
                        {item.last_user_name && (
                          <span className="text-xs text-gray-400">By {item.last_user_name}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => moveToAssembly(item)}
                      disabled={movingId === item.id}
                      className="btn-primary text-xs px-3 py-2 flex-shrink-0"
                    >
                      {movingId === item.id ? 'Moving…' : <><ArrowRight size={13} /> To Assembly</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
