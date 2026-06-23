'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { ListChecks, Package, Search, ChevronRight, Printer, Trash2, AlertTriangle, X } from 'lucide-react'
import { InventoryItem } from '@/lib/types'

const ADMIN_EMAIL = 'yolymarorfiano@yahoo.com'

interface SetWithCount extends InventoryItem {
  contents_count: number
}

export default function SetsPage() {
  const supabase = createClient()
  const [sets, setSets] = useState<SetWithCount[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<SetWithCount | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email === ADMIN_EMAIL) setIsAdmin(true)
    })
    load()
  }, [])

  async function load() {
    const { data: items } = await supabase.from('inventory_items')
      .select('*').eq('item_type', 'instrument_set').order('name')
    const sets = items || []
    const enriched = await Promise.all(sets.map(async s => {
      const { count } = await supabase.from('set_contents')
        .select('id', { count: 'exact', head: true }).eq('set_id', s.id)
      return { ...s, contents_count: count || 0 }
    }))
    setSets(enriched); setLoading(false)
  }

  async function handleDeleteSet() {
    if (!deleteTarget || deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    setDeleteMsg('')

    try {
      // 1. Nullify audit_log references so logs are preserved but not orphaned
      //    audit_logs has item_id as NOT NULL with ON DELETE RESTRICT, so we
      //    update the item_name/qr_code to mark as deleted, then delete contents + item
      //    NOTE: We intentionally do NOT delete audit_logs — they are the permanent record.

      // Delete set_contents first (no audit dependency)
      await supabase.from('set_contents').delete().eq('set_id', deleteTarget.id)

      // Delete dispense_records, inspections, or_verifications, alerts linked to this item
      await supabase.from('or_verifications').delete().eq('item_id', deleteTarget.id)
      await supabase.from('inspections').delete().eq('item_id', deleteTarget.id)
      await supabase.from('dispense_records').delete().eq('item_id', deleteTarget.id)
      await supabase.from('alerts').delete().eq('item_id', deleteTarget.id)

      // Update audit logs to mark item as deleted (preserves the record)
      await supabase.from('audit_logs').update({
        item_name: `[DELETED] ${deleteTarget.name}`,
      }).eq('item_id', deleteTarget.id)

      // Now delete the inventory item itself
      const { error } = await supabase.from('inventory_items').delete().eq('id', deleteTarget.id)

      if (error) {
        setDeleteMsg(`❌ Error: ${error.message}`)
        setDeleting(false)
        return
      }

      setDeleteMsg('✅ Instrument set deleted. Audit logs preserved.')
      setDeleting(false)
      setDeleteConfirmText('')
      setTimeout(() => {
        setDeleteTarget(null)
        setDeleteMsg('')
        load()
      }, 2000)
    } catch (err: any) {
      setDeleteMsg(`❌ Something went wrong: ${err.message}`)
      setDeleting(false)
    }
  }

  const filtered = sets.filter(s => !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.qr_code.toLowerCase().includes(search.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ListChecks size={22} className="text-brand-500" /> Instrument Sets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage instrument lists for each set — used at receiving and printed for OR staff
          </p>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search instrument sets…"
              className="input-field pl-9" />
          </div>
        </div>

        <div className="card divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No sets found</div>
          ) : filtered.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-brand-500" />
              </div>
              <Link href={`/sets/${s.id}`} className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800">{s.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  <span className="font-mono">{s.qr_code}</span> · {s.contents_count} instruments listed
                </div>
              </Link>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Link href={`/sets/${s.id}/print`} target="_blank"
                  className="text-xs text-brand-500 font-medium flex items-center gap-1 hover:bg-brand-50 px-2 py-1 rounded-lg">
                  <Printer size={12} /> Print
                </Link>
                <Link href={`/sets/${s.id}`}>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>

                {/* Admin-only delete button */}
                {isAdmin && (
                  <button
                    onClick={() => { setDeleteTarget(s); setDeleteConfirmText(''); setDeleteMsg('') }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                    title="Delete this instrument set (admin only)">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">Delete Instrument Set</h2>
                    <p className="text-xs text-gray-500 mt-0.5">This cannot be undone</p>
                  </div>
                </div>
                <button onClick={() => setDeleteTarget(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-gray-700">{deleteTarget.name}</p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{deleteTarget.qr_code}</p>
                <p className="text-xs text-gray-400 mt-1">{deleteTarget.contents_count} instruments listed</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 space-y-1">
                <p className="text-xs font-medium text-amber-800">The following will be deleted:</p>
                <ul className="text-xs text-amber-700 space-y-0.5 ml-1">
                  <li>• The instrument set and its contents list</li>
                  <li>• Related dispense records and inspections</li>
                  <li>• Related alerts</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <p className="text-xs text-green-700 font-medium">
                  ✓ Audit trail logs will be preserved (marked as [DELETED]).
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type <strong className="text-red-600">DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here…"
                  className="input-field font-mono text-sm"
                  autoFocus
                />
              </div>

              {deleteMsg && (
                <p className={`text-sm font-medium text-center ${deleteMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                  {deleteMsg}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="btn-secondary flex-1 justify-center text-sm">
                  Cancel
                </button>
                <button
                  onClick={handleDeleteSet}
                  disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all text-white"
                  style={{
                    background: deleteConfirmText === 'DELETE' && !deleting ? '#DC2626' : '#9CA3AF',
                    cursor: deleteConfirmText !== 'DELETE' || deleting ? 'not-allowed' : 'pointer'
                  }}>
                  {deleting ? (
                    <><span className="animate-spin inline-block">⟳</span> Deleting…</>
                  ) : (
                    <><Trash2 size={14} /> Delete Set</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
