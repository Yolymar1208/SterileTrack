'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { ListChecks, Package, Search, ChevronRight, Printer } from 'lucide-react'
import { InventoryItem } from '@/lib/types'

interface SetWithCount extends InventoryItem {
  contents_count: number
}

export default function SetsPage() {
  const supabase = createClient()
  const [sets, setSets] = useState<SetWithCount[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

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
            Manage instrument lists for each set — these are used at receiving and printed for OR staff
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
              <Link href={`/sets/${s.id}/print`} target="_blank"
                className="text-xs text-brand-500 font-medium flex items-center gap-1 hover:bg-brand-50 px-2 py-1 rounded-lg">
                <Printer size={12} /> Print
              </Link>
              <Link href={`/sets/${s.id}`}>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
