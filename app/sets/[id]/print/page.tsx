'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Printer } from 'lucide-react'
import { InventoryItem, SetContent } from '@/lib/types'
import { format } from 'date-fns'

export default function PrintPage() {
  const { id } = useParams()
  const params = useSearchParams()
  const orRoom = params.get('or') || ''
  const staff = params.get('staff') || ''

  const supabase = createClient()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [contents, setContents] = useState<SetContent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('inventory_items').select('*').eq('id', id).single(),
      supabase.from('set_contents').select('*').eq('set_id', id).order('sort_order'),
    ]).then(([i, c]) => {
      setItem(i.data); setContents(c.data || []); setLoading(false)
    })
  }, [id])

  if (loading) return <div className="p-8 text-center">Loading…</div>
  if (!item) return <div className="p-8 text-center">Set not found</div>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { padding: 0; }
        }
        @page { margin: 1.5cm; }
        body { background: #f5f5f5; }
      `}</style>

      <div className="no-print bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="text-sm text-gray-600">Print preview</span>
        <div className="flex gap-2">
          <button onClick={() => window.close()} className="text-sm px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded">Close</button>
          <button onClick={() => window.print()} className="bg-brand-500 hover:bg-brand-600 text-white text-sm px-4 py-1.5 rounded flex items-center gap-2">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="print-page max-w-2xl mx-auto bg-white p-10 my-6 shadow-sm">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-3 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{item.description || 'Instrument Set'}</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold text-gray-800">{item.qr_code}</div>
              <div className="text-xs text-gray-500 mt-0.5">SterileTrack CSSD</div>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Printed</div>
            <div className="font-medium text-gray-800">{format(new Date(), 'MMM d, yyyy h:mm a')}</div>
          </div>
          {item.sterilization_date && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Sterilized</div>
              <div className="font-medium text-gray-800">{format(new Date(item.sterilization_date), 'MMM d, yyyy h:mm a')}</div>
            </div>
          )}
          {item.expiry_date && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Expires</div>
              <div className="font-medium text-gray-800">{format(new Date(item.expiry_date), 'MMM d, yyyy')}</div>
            </div>
          )}
          {item.shelf_location && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Shelf</div>
              <div className="font-medium text-gray-800">{item.shelf_location}</div>
            </div>
          )}
          {orRoom && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Destination</div>
              <div className="font-medium text-gray-800">{orRoom}</div>
            </div>
          )}
          {staff && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide">Received by</div>
              <div className="font-medium text-gray-800">{staff}</div>
            </div>
          )}
        </div>

        {/* Contents */}
        <div className="mb-5">
          <h2 className="font-bold text-gray-900 mb-2 uppercase tracking-wide text-sm border-b border-gray-300 pb-1">
            Set Contents ({contents.length} items)
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                <th className="text-left py-1.5 font-medium w-10">#</th>
                <th className="text-left py-1.5 font-medium">Instrument</th>
                <th className="text-center py-1.5 font-medium w-16">Qty</th>
                <th className="text-center py-1.5 font-medium w-16">Check</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((c, i) => (
                <tr key={c.id} className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">{i + 1}.</td>
                  <td className="py-2 text-gray-800">{c.instrument_name}</td>
                  <td className="py-2 text-center font-mono text-gray-700">{c.quantity}</td>
                  <td className="py-2 text-center">
                    <span className="inline-block w-5 h-5 border-2 border-gray-400 rounded"></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {contents.length === 0 && (
            <p className="text-center text-gray-400 py-4 italic">No instruments listed for this set.</p>
          )}
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-10 text-sm">
          <div>
            <div className="border-b border-gray-400 h-10 mb-1"></div>
            <div className="text-xs text-gray-600">Dispensed by (CSSD Personnel)</div>
          </div>
          <div>
            <div className="border-b border-gray-400 h-10 mb-1"></div>
            <div className="text-xs text-gray-600">Received by (OR Nurse) {staff && `— ${staff}`}</div>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-400">
          SterileTrack CSSD Management · This list verifies the contents of {item.name} at dispensing
        </div>
      </div>
    </>
  )
}
