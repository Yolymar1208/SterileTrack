'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Wrench, QrCode, Package, ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { InventoryItem } from '@/lib/types'
import { format, differenceInMinutes } from 'date-fns'

export default function AssemblyPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('inventory_items').select('*').eq('status', 'assembly').order('updated_at', { ascending: true })
    setItems(data || []); setLoading(false)
  }

  async function moveToSterilization(item: InventoryItem) {
    setMovingId(item.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, department').eq('id', user!.id).single()
    const name = profile?.full_name || user?.email?.split('@')[0] || 'Staff'
    await supabase.from('inventory_items').update({ status: 'sterilization', location: 'Sterilization Room', last_user_id: user!.id, last_user_name: name, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('audit_logs').insert({ item_id: item.id, item_name: item.name, item_qr_code: item.qr_code, action: 'sent_for_sterilization', performed_by_id: user!.id, performed_by_name: name, department: profile?.department, location: 'Sterilization Room', device_used: 'Web Browser' })
    setMovingId(null); load()
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Wrench size={22} className="text-purple-500" /> Assembly</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} items currently in assembly</p>
          </div>
          <Link href="/scan" className="btn-primary text-sm px-3 py-2"><QrCode size={14} /> Scan In</Link>
        </div>

        {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div>
        : items.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle2 size={40} className="text-purple-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Assembly queue is clear! 🎉</p>
            <p className="text-sm text-gray-400 mt-1">No items currently in assembly.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const mins = differenceInMinutes(new Date(), new Date(item.updated_at))
              const delayed = mins > 60
              return (
                <div key={item.id} className={`card p-4 border ${delayed ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{item.qr_code}</div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${delayed ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {delayed ? '⚠ ' : ''}{mins < 60 ? `${mins}min` : `${Math.floor(mins/60)}h ${mins%60}min`} in assembly
                        </span>
                        <span className="text-xs text-gray-400">Since {format(new Date(item.updated_at), 'h:mm a')}</span>
                        {item.last_user_name && <span className="text-xs text-gray-400">By {item.last_user_name}</span>}
                      </div>
                    </div>
                    <button onClick={() => moveToSterilization(item)} disabled={movingId === item.id} className="btn-primary text-xs px-3 py-2 flex-shrink-0">
                      {movingId === item.id ? 'Moving…' : <><ArrowRight size={13} /> To Sterilization</>}
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
