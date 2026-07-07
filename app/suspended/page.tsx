'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Shield, Lock, Phone } from 'lucide-react'

function SuspendedContent() {
  const searchParams = useSearchParams()
  const hospital     = searchParams.get('hospital') || ''

  return (
    <div className="w-full max-w-sm text-center relative">
      <div style={{
        width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px',
        background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Shield size={24} className="text-white" />
      </div>

      <div style={{
        width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
        background: 'rgba(232,58,58,0.12)', border: '1px solid rgba(232,58,58,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Lock size={28} style={{ color: '#E83A3A' }} />
      </div>

      <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 500, marginBottom: 8, letterSpacing: '-0.3px' }}>
        Account Suspended
      </h1>

      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
        {hospital
          ? `The SterileTrack account for "${hospital.toUpperCase()}" is currently inactive.`
          : 'This SterileTrack account is currently inactive.'
        }
        {' '}Please contact your administrator to restore access.
      </p>

      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '16px 20px', marginBottom: 24, textAlign: 'left'
      }}>
        <div style={{
          color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10
        }}>
          Contact SterileTrack Support
        </div>
        <div className="flex items-center gap-2.5">
          <Phone size={15} style={{ color: '#00C9D4', flexShrink: 0 }} />
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              yolymarorfiano@yahoo.com
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
              Reference your hospital name when contacting us
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => window.location.href = '/'}
        style={{
          background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)', fontSize: 13, borderRadius: 9,
          padding: '9px 20px', cursor: 'pointer'
        }}>
        ← Back to Login
      </button>

      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, marginTop: 24 }}>
        © {new Date().getFullYear()} SterileTrack · CSSD Management
      </p>
    </div>
  )
}

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0A0F1E' }}>

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(232,58,58,0.06) 0%, transparent 60%)',
      }} />

      <Suspense fallback={
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading…</div>
      }>
        <SuspendedContent />
      </Suspense>
    </div>
  )
}
