'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { ListChecks, Plus, Trash2, ArrowLeft, Printer, Save, Edit2 } from 'lucide-react'
import { InventoryItem, SetContent } from '@/lib/types'

export default function SetDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [contents, setContents] = useState<SetContent[]>([])
  const [loading, setLoading] = useState(true)
  const [newInstr, setNewInstr] = useState({ name: '', qty: 1 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ name: string; qty: number }>({ name: '', qty: 1 })

  useEffect(() => { load() }, [id])

  async function load() {
    const { data: i } = await supabase.from('inventory_items').select('*').eq('id', id).single()
    setItem(i)
    const { data: c } = await supabase.from('set_contents').select('*').eq('set_id', id).order('sort_order')
    setContents(c || [])
    setLoading(false)
  }

  async function addItem() {
    if (!newInstr.name.trim()) return
    const { data } = await supabase.from('set_contents').insert({
      set_id: id,
      instrument_name: newInstr.name.trim(),
      quantity: newInstr.qty,
      sort_order: contents.length + 1,
    }).select().single()
    if (data) {
      setContents(c => [...c, data])
      setNewInstr({ name: '', qty: 1 })
    }
  }

  async function removeItem(itemId: string) {
    await supabase.from('set_contents').delete().eq('id', itemId)
    setContents(c => c.filter(i => i.id !== itemId))
  }

  function startEdit(c: SetContent) {
    setEditingId(c.id)
    setEditValues({ name: c.instrument_name, qty: c.quantity })
  }

  async function saveEdit(itemId: string) {
    await supabase.from('set_contents').update({
      instrument_name: editValues.name, quantity: editValues.qty,
    }).eq('id', itemId)
    setContents(c => c.map(i => i.id === itemId ? { ...i, instrument_name: editValues.name, quantity: editValues.qty } : i))
    setEditingId(null)
  }

  if (loading) return <AppLayout><div className="p-8 text-center text-gray-400">Loading…</div></AppLayout>
  if (!item) return <AppLayout><div className="p-8 text-center text-gray-400">Set not found</div></AppLayout>

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Link href="/sets" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={15} /> Back to Sets
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <ListChecks size={22} className="text-brand-500" /> {item.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-mono">{item.qr_code}</span> · Edit the list of instruments below
            </p>
          </div>
          <Link href={`/sets/${id}/print`} target="_blank" className="btn-secondary text-sm px-3 py-2">
            <Printer size={14} /> Print
          </Link>
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-medium text-gray-800 text-sm mb-3">
            Instrument List <span className="text-gray-400 font-normal">({contents.length} items)</span>
          </h2>

          {contents.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-xl mb-3">
              <p className="text-sm text-gray-500">No instruments listed yet. Add the first one below.</p>
            </div>
          ) : (
            <div className="space-y-1.5 mb-3">
              {contents.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-400 w-6 text-center">{i + 1}.</span>
                  {editingId === c.id ? (
                    <>
                      <input type="text" value={editValues.name}
                        onChange={e => setEditValues({...editValues, name: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(c.id)}
                        className="input-field flex-1 text-sm" autoFocus />
                      <input type="number" min={1} value={editValues.qty}
                        onChange={e => setEditValues({...editValues, qty: parseInt(e.target.value) || 1})}
                        className="input-field w-16 text-sm" />
                      <button onClick={() => saveEdit(c.id)} className="text-green-500 hover:bg-green-50 p-1.5 rounded">
                        <Save size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 text-sm text-gray-700">{c.instrument_name}</div>
                      <span className="text-xs font-mono bg-white px-2 py-0.5 rounded text-gray-600">×{c.quantity}</span>
                      <button onClick={() => startEdit(c)} className="text-gray-400 hover:text-brand-500 p-1.5 rounded">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => removeItem(c.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Add new instrument</label>
            <div className="flex gap-2">
              <input type="text" value={newInstr.name}
                onChange={e => setNewInstr({...newInstr, name: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder='e.g. Mayo Scissors 6"'
                className="input-field flex-1 text-sm" />
              <input type="number" min={1} value={newInstr.qty}
                onChange={e => setNewInstr({...newInstr, qty: parseInt(e.target.value) || 1})}
                className="input-field w-16 text-sm" />
              <button onClick={addItem} disabled={!newInstr.name.trim()} className="btn-primary px-3">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
