'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Flame, Plus, Package, CheckCircle2, Loader2, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import { InventoryItem } from '@/lib/types'
import { format, differenceInMinutes } from 'date-fns'

export default function SterilizationPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [showNewLoad, setShowNewLoad] = useState(false)
  const [loadName, setLoadName] = useState('')
  const [sterilizer, setSterilizer] = useState('Autoclave A')
  const [savingLoad, setSavingLoad] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('inventory_items').select('*').eq('status', 'sterilization').order('updated_at', { ascending: true })
    setItems(data || []); setLoading(false)
  }

  async function moveToStorage(item: InventoryItem) {
    setMovingId(item.id)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name, department').eq('id', user!.id).single()
    const name = profile?.full_name || user?.email?.split('@')[0] || 'Staff'
    await supabase.from('inventory_items').update({
      status: 'sterile', location: 'Storage', last_user_id: user!.id, last_user_name: name,
      sterilization_date: new Date().toISOString(), expiry_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', item.id)
    await supabase.from('audit_logs').insert({ item_id: item.id, item_name: item.name, item_qr_code: item.qr_code, action: 'released_to_storage', performed_by_id: user!.id, performed_by_name: name, department: profile?.department, location: 'Storage', device_used: 'Web Browser' })
    setMovingId(null); load()
  }

  async function saveLoad() {
    if (!loadName) return
    setSavingLoad(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
    await supabase.from('sterilization_loads').insert({
      load_number: loadName, sterilizer_name: sterilizer,
      status: 'running', cycle_start: new Date().toISOString(),
      operator_id: user!.id, operator_name: profile?.full_name || 'Staff',
      biological_indicator: true, chemical_indicator: true,
    })
    setSavingLoad(false); setShowNewLoad(false); setLoadName('')
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><Flame size={22} className="text-orange-500" /> Sterilization</h1>
            <p className="text-sm text-gray-500 mt-0.5">{items.length} items in sterilization queue</p>
          </div>
          <button onClick={() => setShowNewLoad(true)} className="btn-primary text-sm px-3 py-2"><Plus size={14} /> New Load</button>
        </div>

        {/* New Load Modal */}
        {showNewLoad && (
          <div className="card p-5 mb-4 border-orange-200 bg-orange-50">
            <h3 className="font-medium text-gray-800 mb-3">Start New Sterilization Load</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Load Number</label>
                <input type="text" value={loadName} onChange={e => setLoadName(e.target.value)} placeholder="e.g. LOAD-2026-001" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sterilizer</label>
                <select value={sterilizer} onChange={e => setSterilizer(e.target.value)} className="input-field">
                  <option>Autoclave A</option>
                  <option>Autoclave B</option>
                  <option>Autoclave C</option>
                  <option>ETO Sterilizer</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewLoad(false)} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
                <button onClick={saveLoad} disabled={!loadName || savingLoad} className="btn-primary flex-1 justify-center text-sm">
                  {savingLoad ? <Loader2 size={14} className="animate-spin" /> : 'Start Load'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="card p-8 text-center text-gray-400">Loading…</div>
        : items.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle2 size={40} className="text-orange-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Sterilization queue is clear! 🎉</p>
            <p className="text-sm text-gray-400 mt-1">All items have been processed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const mins = differenceInMinutes(new Date(), new Date(item.updated_at))
              return (
                <div key={item.id} className="card p-4 border border-gray-100">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{item.qr_code}</div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 flex items-center gap-1">
                          <Clock size={10} /> {mins < 60 ? `${mins}min` : `${Math.floor(mins/60)}h ${mins%60}min`} in sterilizer
                        </span>
                        <span className="text-xs text-gray-400">Since {format(new Date(item.updated_at), 'h:mm a')}</span>
                      </div>
                    </div>
                    <button onClick={() => moveToStorage(item)} disabled={movingId === item.id} className="btn-primary text-xs px-3 py-2 flex-shrink-0 bg-green-600 hover:bg-green-700">
                      {movingId === item.id ? 'Saving…' : <><CheckCircle2 size={13} /> Mark Sterile</>}
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
