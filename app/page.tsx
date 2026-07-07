'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const router   = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Sign in
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      // Step 2: Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Could not get user after login.')
        setLoading(false)
        return
      }

      // Step 3: Get profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, hospital_id')
        .eq('id', user.id)
        .single()

      if (profileError) {
        setError('Profile error: ' + profileError.message)
        setLoading(false)
        return
      }

      if (!profile) {
        setError('No profile found for this account.')
        setLoading(false)
        return
      }

      // Step 4: Superadmin check
      if (profile.role === 'system_admin') {
        router.push('/superadmin')
        return
      }

      // Step 5: Get hospital slug
      if (!profile.hospital_id) {
        setError('Your account is not linked to a hospital.')
        setLoading(false)
        return
      }

      const { data: hospital, error: hospitalError } = await supabase
        .from('hospitals')
        .select('slug')
        .eq('id', profile.hospital_id)
        .single()

      if (hospitalError) {
        setError('Hospital error: ' + hospitalError.message)
        setLoading(false)
        return
      }

      if (!hospital?.slug) {
        setError('Hospital not found.')
        setLoading(false)
        return
      }

      // Step 6: Redirect
      router.push(`/${hospital.slug}/dashboard`)

    } catch (err: any) {
      setError('Unexpected error: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#0A0F1E' }}>

      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(0,201,212,0.08) 0%, transparent 60%)',
      }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={24} className="text-white" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 500, letterSpacing: '-0.5px', marginBottom: 4 }}>
            SterileTrack
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>
            CSSD Management System
          </p>
        </div>

        <div style={{
          background: '#fff', borderRadius: 16, padding: '28px 28px 24px',
          border: '0.5px solid rgba(255,255,255,0.08)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: '#0D1117', marginBottom: 4, letterSpacing: '-0.2px' }}>
            Welcome back 👋
          </h2>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>
            Sign in to continue
          </p>

          {error && (
            <div style={{
              background: '#FEE2E2', border: '0.5px solid #FCA5A5',
              color: '#B91C1C', fontSize: 13, borderRadius: 8,
              padding: '10px 12px', marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@hospital.com" required className="input-field" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="input-field" style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 2
                  }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 9, border: 'none',
                background: loading ? '#9CA3AF' : '#00C9D4',
                color: '#fff', fontSize: 14, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.1px', transition: 'background 0.15s', marginTop: 4,
              }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
            Trouble signing in? Contact your CSSD Supervisor.
          </p>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 11, marginTop: 20 }}>
          © {new Date().getFullYear()} SterileTrack · CSSD Management
        </p>
      </div>
    </div>
  )
}
