'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Shield } from 'lucide-react'

type SetContent = {
  id: string
  instrument_name: string
  quantity: number
  sort_order: number
}

type Item = {
  id: string
  name: string
  qr_code: string
  status: string
  shelf_location: string | null
}

export default function SetChecklistPrintPage() {
  const supabase   = createClient()
  const params     = useParams()
  const setId      = params?.id as string
  const [item, setItem]         = useState<Item | null>(null)
  const [contents, setContents] = useState<SetContent[]>([])
  const [hospital, setHospital] = useState('')
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('hospitals(name)')
        .eq('id', user.id)
        .single()
      setHospital((profile?.hospitals as any)?.name || '')

      const { data: i } = await supabase
        .from('inventory_items')
        .select('id, name, qr_code, status, shelf_location')
        .eq('id', setId)
        .single()
      setItem(i)

      const { data: c } = await supabase
        .from('set_contents')
        .select('*')
        .eq('set_id', setId)
        .order('sort_order')
      setContents(c || [])
      setLoading(false)

      // Auto-print after load
      setTimeout(() => window.print(), 800)
    }
    load()
  }, [setId])

  const totalPieces = contents.reduce((sum, c) => sum + c.quantity, 0)
  const printDate   = new Date().toLocaleDateString('en-PH', { dateStyle: 'long' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6B7280' }}>
      Preparing checklist…
    </div>
  )

  if (!item) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6B7280' }}>
      Set not found.
    </div>
  )

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; color: #0A0F1E; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 0.5in; size: A4 portrait; }
        @media screen { body { padding: 40px; max-width: 760px; margin: 0 auto; } }
        table { width: 100%; border-collapse: collapse; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
        .no-print { }
        @media print { .no-print { display: none !important; } }
      `}</style>

      {/* Screen-only controls */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button onClick={() => window.print()}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Print / Save PDF
        </button>
        <button onClick={() => window.close()}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>

      {/* Checklist header */}
      <div style={{ borderBottom: '2px solid #00C9D4', paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={14} color="white" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0A0F1E' }}>SterileTrack</div>
                <div style={{ fontSize: 10, color: '#6B7280' }}>Instrument Set Checklist</div>
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0A0F1E', letterSpacing: '-0.3px' }}>{item.name}</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>{hospital}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#6B7280' }}>
            <div><strong>Code:</strong> {item.qr_code}</div>
            <div><strong>Status:</strong> {item.status.charAt(0).toUpperCase() + item.status.slice(1)}</div>
            {item.shelf_location && <div><strong>Shelf:</strong> {item.shelf_location}</div>}
            <div><strong>Date:</strong> {printDate}</div>
            <div><strong>Total Pieces:</strong> {totalPieces}</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#0F766E' }}>
        <strong>Instructions:</strong> Verify each instrument against this list before and after the surgical procedure. Check the box when confirmed. Report any discrepancy to CSSD immediately.
      </div>

      {/* Instrument table */}
      <table>
        <thead>
          <tr style={{ background: '#0A0F1E' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#fff', width: 40 }}>#</th>
            <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#fff' }}>Instrument Name</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#fff', width: 60 }}>Qty</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#fff', width: 80 }}>Before OR</th>
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#fff', width: 80 }}>After OR</th>
          </tr>
        </thead>
        <tbody>
          {contents.map((c, i) => (
            <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#F9FAFB', borderBottom: '1px solid #F3F4F6' }}>
              <td style={{ padding: '10px 12px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>{i + 1}</td>
              <td style={{ padding: '10px 12px', fontSize: 13, color: '#0A0F1E', fontWeight: 500 }}>
                {c.instrument_name}
                {c.quantity === 0 && <span style={{ marginLeft: 8, fontSize: 10, color: '#B91C1C', fontWeight: 600, background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>MISSING</span>}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#0A0F1E' }}>{c.quantity}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ width: 22, height: 22, border: '2px solid #D1D5DB', borderRadius: 4, margin: '0 auto' }} />
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                <div style={{ width: 22, height: 22, border: '2px solid #D1D5DB', borderRadius: 4, margin: '0 auto' }} />
              </td>
            </tr>
          ))}
          {/* Total row */}
          <tr style={{ background: '#F0FDFA', borderTop: '2px solid #00C9D4' }}>
            <td colSpan={2} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#0F766E' }}>TOTAL PIECES</td>
            <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0F766E' }}>{totalPieces}</td>
            <td colSpan={2} />
          </tr>
        </tbody>
      </table>

      {/* Signature area */}
      <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {['Prepared by (CSSD)', 'Released by (CSSD)', 'Received by (OR Nurse)'].map(label => (
          <div key={label}>
            <div style={{ borderBottom: '1.5px solid #D1D5DB', marginBottom: 6, height: 40 }} />
            <div style={{ fontSize: 10, color: '#6B7280', textAlign: 'center' }}>{label}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center', marginTop: 2 }}>Signature over printed name</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, borderTop: '1px solid #EDEEF0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9CA3AF' }}>
        <span>Generated by SterileTrack · steriletrak.com</span>
        <span>{item.qr_code} · {printDate}</span>
      </div>
    </>
  )
}
