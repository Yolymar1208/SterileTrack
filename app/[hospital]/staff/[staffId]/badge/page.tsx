'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Shield } from 'lucide-react'

type Staff = {
  id: string
  full_name: string
  role: string
  employee_id: string | null
  qr_code: string | null
  department: string | null
}

const ROLE_LABELS: Record<string, string> = {
  cssd_technician:    'CSSD Technician',
  cssd_supervisor:    'CSSD Supervisor',
  or_nurse:           'OR Nurse',
  or_supervisor:      'OR Supervisor',
  hospital_admin:     'Hospital Admin',
  system_admin:       'System Admin',
  infection_control:  'Infection Control',
  materials_management: 'Materials Management',
}

// Simple pseudo-QR visual using the code string as seed
function QRPattern({ code, size = 120 }: { code: string; size?: number }) {
  const cell  = Math.floor(size / 7)
  const cells = 7

  // Generate deterministic grid from code
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = (hash * 31 + code.charCodeAt(i)) >>> 0
  }

  function isSet(row: number, col: number): boolean {
    // Finder patterns
    if (row < 3 && col < 3) return true
    if (row < 3 && col >= 4) return true
    if (row >= 4 && col < 3) return true
    // Data modules
    const idx = row * cells + col
    return ((hash >> (idx % 32)) & 1) === 1
  }

  const svgSize = cell * cells
  const rects: JSX.Element[] = []
  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      if (isSet(r, c)) {
        rects.push(
          <rect key={`${r}-${c}`} x={c * cell} y={r * cell} width={cell - 1} height={cell - 1} fill="#0A0F1E" />
        )
      }
    }
  }

  return (
    <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
      <rect width={svgSize} height={svgSize} fill="white" />
      {rects}
    </svg>
  )
}

export default function StaffBadgePrintPage() {
  const supabase  = createClient()
  const params    = useParams()
  const staffId   = params?.staffId as string
  const [staff, setStaff]     = useState<Staff | null>(null)
  const [hospital, setHospital] = useState('')
  const [loading, setLoading] = useState(true)

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

      const { data: s } = await supabase
        .from('profiles')
        .select('id, full_name, role, employee_id, qr_code, department')
        .eq('id', staffId)
        .single()
      setStaff(s)
      setLoading(false)

      setTimeout(() => window.print(), 600)
    }
    load()
  }, [staffId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6B7280' }}>
      Preparing badge…
    </div>
  )

  if (!staff) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#6B7280' }}>
      Staff not found.
    </div>
  )

  const roleLabel = ROLE_LABELS[staff.role] || staff.role.replace(/_/g, ' ')
  const initials  = staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #EDEEF0; display: flex; align-items: center; justify-content: center; min-height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 0; size: 3.375in 2.125in landscape; }
        @media print {
          body { background: white; display: block; min-height: auto; }
          .no-print { display: none !important; }
          .badge { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; width: 100% !important; height: 100% !important; }
        }
        @media screen {
          .badge { margin: 24px; }
        }
      `}</style>

      {/* Controls */}
      <div className="no-print" style={{ position: 'fixed', top: 16, right: 16, display: 'flex', gap: 8, zIndex: 100 }}>
        <button onClick={() => window.print()}
          style={{ padding: '8px 16px', borderRadius: 8, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
          Print Badge
        </button>
        <button onClick={() => window.close()}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', cursor: 'pointer', fontSize: 13 }}>
          Close
        </button>
      </div>

      {/* Badge — credit card size: 3.375in × 2.125in */}
      <div className="badge" style={{
        width: 324, height: 204,
        background: '#0A0F1E',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Top accent stripe */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #00C9D4, #0088A9)', flexShrink: 0 }} />

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', padding: '14px 16px', gap: 14 }}>

          {/* Left — staff info */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            {/* Hospital + logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Shield size={11} color="white" />
              </div>
              <div>
                <div style={{ color: '#00C9D4', fontSize: 9, fontWeight: 700, letterSpacing: '0.03em' }}>SterileTrack</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, lineHeight: 1.2 }}>{hospital}</div>
              </div>
            </div>

            {/* Avatar + name */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: '#fff',
                }}>
                  {initials}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {staff.full_name}
                  </div>
                  <div style={{ color: '#00C9D4', fontSize: 9, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {roleLabel}
                  </div>
                </div>
              </div>

              {/* ID + Department */}
              <div style={{ display: 'flex', gap: 12 }}>
                {staff.employee_id && (
                  <div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontFamily: 'monospace' }}>{staff.employee_id}</div>
                  </div>
                )}
                {staff.department && (
                  <div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{staff.department}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — QR code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ background: '#fff', padding: 5, borderRadius: 6 }}>
              {staff.qr_code ? (
                <QRPattern code={staff.qr_code} size={84} />
              ) : (
                <div style={{ width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 9, textAlign: 'center', padding: 4 }}>
                  No QR code assigned
                </div>
              )}
            </div>
            {staff.qr_code && (
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 7, fontFamily: 'monospace', textAlign: 'center' }}>
                {staff.qr_code}
              </div>
            )}
          </div>
        </div>

        {/* Bottom strip */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #0088A9, #00C9D4)', flexShrink: 0 }} />
      </div>
    </>
  )
}
