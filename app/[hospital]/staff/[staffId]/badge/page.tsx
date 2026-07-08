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

// Real QR code image using the staff's assigned QR code value
function QRImage({ code, size = 84 }: { code: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=0a0f1e&margin=4`
  return (
    <img
      src={url}
      alt={`QR Code: ${code}`}
      width={size}
      height={size}
      style={{ display: 'block', borderRadius: 2 }}
    />
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
      if (!user) { window.location.href = '/'; return }

      // Only the owner can print their own badge
      if (user.id !== staffId) {
        setLoading(false)
        setStaff(null)
        return
      }

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial, sans-serif', color: '#374151', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Access Denied</div>
      <div style={{ fontSize: 14, color: '#6B7280' }}>You can only print your own badge.</div>
    </div>
  )

  const roleLabel = ROLE_LABELS[staff.role] || staff.role.replace(/_/g, ' ')
  const initials  = staff.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: #F3F4F6; display: flex; align-items: center; justify-content: center; min-height: 100vh; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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
        background: '#FFFFFF',
        border: '1.5px solid #E5E7EB',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
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
                <div style={{ color: '#00B8C2', fontSize: 9, fontWeight: 700, letterSpacing: '0.03em' }}>SterileTrack</div>
                <div style={{ color: '#9CA3AF', fontSize: 7, lineHeight: 1.2 }}>{hospital}</div>
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
                  <div style={{ color: '#0A0F1E', fontSize: 13, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                    {staff.full_name}
                  </div>
                  <div style={{ color: '#00B8C2', fontSize: 9, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {roleLabel}
                  </div>
                </div>
              </div>

              {/* ID + Department */}
              <div style={{ display: 'flex', gap: 12 }}>
                {staff.employee_id && (
                  <div>
                    <div style={{ fontSize: 7, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee ID</div>
                    <div style={{ fontSize: 10, color: '#374151', fontWeight: 600, fontFamily: 'monospace' }}>{staff.employee_id}</div>
                  </div>
                )}
                {staff.department && (
                  <div>
                    <div style={{ fontSize: 7, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Department</div>
                    <div style={{ fontSize: 10, color: '#374151', fontWeight: 600 }}>{staff.department}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — QR code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <div style={{ background: '#fff', padding: 5, borderRadius: 6 }}>
              {staff.qr_code ? (
                <QRImage code={staff.qr_code} size={84} />
              ) : (
                <div style={{ width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 9, textAlign: 'center', padding: 4 }}>
                  No QR code assigned
                </div>
              )}
            </div>
            {staff.qr_code && (
              <div style={{ color: '#9CA3AF', fontSize: 7, fontFamily: 'monospace', textAlign: 'center' }}>
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
