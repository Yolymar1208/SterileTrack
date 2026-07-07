'use client'

import { useHospitalSlug } from '@/lib/hospital'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ListChecks, Plus, Trash2, ArrowLeft, Printer, Save, Edit2, X } from 'lucide-react'
import { InventoryItem, SetContent } from '@/lib/types'

export default function SetDetailPage() {
  const { id } = useParams()
  const supabase = createClient()
  const slug = useHospitalSlug()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [contents, setContents] = useState<SetContent[]>([])
  const [loading, setLoading] = useState(true)
  const [newInstr, setNewInstr] = useState({ name: '', qty: 1 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ name: string; qty: number }>({ name: '', qty: 1 })
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => setCurrentUser({ id: user.id, name: data?.full_name || user.email?.split('@')[0] || 'Staff' }))
    })
    load()
  }, [id])

  async function load() {
    const { data: i } = await supabase.from('inventory_items').select('*').eq('id', id).single()
    setItem(i)
    const { data: c } = await supabase.from('set_contents').select('*').eq('set_id', id).order('sort_order')
    setContents(c || [])
    setLoading(false)
  }

  async function logSetEdit(action: string, detail: string) {
    if (!item || !currentUser) return
    await supabase.from('audit_logs').insert({
      item_id: item.id,
      item_name: item.name,
      item_qr_code: item.qr_code,
      action: 'set_contents_updated',
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.name,
      location: 'Instrument Sets Manager',
      device_used: 'Web Browser',
      notes: `${action}: ${detail}`,
    })
  }

  async function addItem() {
    if (!newInstr.name.trim() || !item) return
    const { data } = await supabase.from('set_contents').insert({
      set_id: id,
      instrument_name: newInstr.name.trim(),
      quantity: newInstr.qty,
      sort_order: contents.length + 1,
    }).select().single()
    if (data) {
      setContents(c => [...c, data])
      await logSetEdit('Added instrument', `${newInstr.qty}× ${newInstr.name.trim()}`)
      setNewInstr({ name: '', qty: 1 })
    }
  }

  async function removeItem(itemId: string) {
    const target = contents.find(c => c.id === itemId)
    await supabase.from('set_contents').delete().eq('id', itemId)
    setContents(c => c.filter(i => i.id !== itemId))
    if (target) await logSetEdit('Removed instrument', `${target.quantity}× ${target.instrument_name}`)
    setEditingId(null)
  }

  function startEdit(c: SetContent) {
    setEditingId(c.id)
    setEditValues({ name: c.instrument_name, qty: c.quantity })
  }

  async function saveEdit(itemId: string) {
    const original = contents.find(c => c.id === itemId)
    // Allow qty 0 — valid for tracking purposes (item missing/empty)
    const safeQty = Math.max(0, editValues.qty)
    await supabase.from('set_contents').update({
      instrument_name: editValues.name,
      quantity: safeQty,
    }).eq('id', itemId)
    setContents(c => c.map(i => i.id === itemId ? { ...i, instrument_name: editValues.name, quantity: safeQty } : i))
    if (original) {
      await logSetEdit('Edited instrument',
        `"${original.instrument_name}" → "${editValues.name}" (qty: ${original.quantity} → ${safeQty})`)
    }
    setEditingId(null)
  }

  if (loading) return <AppLayout><div className="p-8 text-center text-gray-400">Loading…</div></AppLayout>
  if (!item) return <AppLayout><div className="p-8 text-center text-gray-400">Set not found</div></AppLayout>

  return (
    <>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Link href={`/${slug}/sets`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={15} /> Back to Sets
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <ListChecks size={22} className="text-brand-500" /> {item.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-mono">{item.qr_code}</span> · {contents.length} instruments
            </p>
          </div>
          <Link href={`/${slug}/sets/${id}/print`} target="_blank" className="btn-secondary text-sm px-3 py-2">
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
                <div key={c.id} className={`flex items-center gap-2 p-2.5 rounded-lg ${editingId === c.id ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                  <span className="text-xs text-gray-400 w-6 text-center flex-shrink-0">{i + 1}.</span>

                  {editingId === c.id ? (
                    <>
                      <input type="text" value={editValues.name}
                        onChange={e => setEditValues({...editValues, name: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(c.id)}
                        className="input-field flex-1 text-sm" autoFocus />
                      {/* qty allows 0 */}
                      <input
                        type="number"
                        min={0}
                        value={editValues.qty}
                        onChange={e => setEditValues({...editValues, qty: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                        className="input-field w-16 text-sm"
                      />
                      <button onClick={() => saveEdit(c.id)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Save">
                        <Save size={15} />
                      </button>
                      <button onClick={() => removeItem(c.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
                        <Trash2 size={15} />
                      </button>
                      <button onClick={() => setEditingId(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors" title="Cancel">
                        <X size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 text-sm text-gray-700 flex items-center gap-2">
                        {c.instrument_name}
                        {c.quantity === 0 && (
                          <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Missing</span>
                        )}
                      </div>
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border text-gray-600 ${
                        c.quantity === 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200'
                      }`}>×{c.quantity}</span>
                      <button onClick={() => startEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded transition-colors" title="Edit">
                        <Edit2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add new instrument */}
          <div className="border-t border-gray-100 pt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Add new instrument</label>
            <div className="flex gap-2">
              <input type="text" value={newInstr.name}
                onChange={e => setNewInstr({...newInstr, name: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                placeholder='e.g. Mayo Scissors 6"'
                className="input-field flex-1 text-sm" />
              <input
                type="number"
                min={0}
                value={newInstr.qty}
                onChange={e => setNewInstr({...newInstr, qty: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                className="input-field w-16 text-sm"
              />
              <button onClick={addItem} disabled={!newInstr.name.trim()} className="btn-primary px-3 text-sm">
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Edit log note */}
        <div className="card p-4 bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700">
            📋 All edits to this instrument list are logged in the Audit Trail for accountability.
            Setting a quantity to 0 marks an instrument as missing in the checklist.
          </p>
        </div>
      </div>
    </>
  )
}
