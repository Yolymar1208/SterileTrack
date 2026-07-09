'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Shield, QrCode, Bell, ClipboardCheck,
  ArrowRight, CheckCircle, ChevronDown,
  Package, History, Users, Menu, X, Eye, EyeOff
} from 'lucide-react'

const features = [
  { icon: QrCode, title: 'Unique Code Tracking', desc: 'Every instrument set gets a unique code. Scan to receive, dispense, or verify — no manual entry, no transcription errors.' },
  { icon: ClipboardCheck, title: 'OR Verification', desc: 'After dispatch, OR nurses confirm instrument completeness directly in the app. Auto-confirms after 1 hour if no action is taken.' },
  { icon: Bell, title: 'Real-Time Alerts', desc: 'Quantity discrepancies, missing instruments, and expiring sterile packs trigger instant alerts — resolved before the next case.' },
  { icon: History, title: 'Permanent Audit Trail', desc: 'Every handover, inspection, and sterilization cycle is logged with timestamp and staff name. Always ready for accreditation.' },
  { icon: Package, title: 'Sterilization Workflow', desc: 'From decontamination to shelf assignment — the full CSSD cycle in one system. No more sticky notes or paper logbooks.' },
  { icon: Users, title: 'Staff Directory & QR IDs', desc: 'Each staff member gets a unique QR badge. Scan to log who received, dispatched, or verified any instrument set.' },
]

const steps = [
  { number: '01', label: 'Receive', title: 'Instruments arrive at CSSD', desc: 'CSSD staff scans the set unique code, inspects each instrument, records quantities, and logs who returned it from the OR.' },
  { number: '02', label: 'Sterilize', title: 'Pack, sterilize, and store', desc: 'Sets are packed, sterilization is confirmed, and assigned to a specific shelf. Expiry is tracked automatically.' },
  { number: '03', label: 'Dispense', title: 'Release to the OR', desc: 'OR nurses scan their QR badge to receive the set. A verification reminder fires — confirmed in app or auto-cleared after 1 hour.' },
]

const plans = [
  { name: 'Pilot', price: 'Free', sub: 'For evaluation', features: ['Unlimited staff', 'Unlimited sets', 'Full audit trail', 'OR verification', 'Priority support'], cta: 'Contact us', highlight: false },
  { name: 'Starter', price: '₱1,500', sub: 'per month', features: ['Up to 3 staff', 'Up to 50 sets', 'OR verification', 'Alerts & notifications', 'Email support'], cta: 'Get started', highlight: false },
  { name: 'Professional', price: '₱3,500', sub: 'per month', features: ['Unlimited staff', 'Unlimited sets', 'Full audit trail export', 'Analytics dashboard', 'Priority support'], cta: 'Get started', highlight: true },
  { name: 'Enterprise', price: '₱8,000', sub: 'per month', features: ['Everything in Professional', 'Multi-department support', 'Custom onboarding', 'Dedicated account manager', 'SLA guarantee'], cta: 'Contact us', highlight: false },
]

function LoginCard() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError(authError.message); setLoading(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Could not get user after login.'); setLoading(false); return }

      const { data: profile, error: profileError } = await supabase
        .from('profiles').select('role, hospital_id').eq('id', user.id).single()
      if (profileError) { setError('Profile error: ' + profileError.message); setLoading(false); return }
      if (!profile) { setError('No profile found for this account.'); setLoading(false); return }

      if (profile.role === 'system_admin') { window.location.href = '/superadmin'; return }

      if (!profile.hospital_id) { setError('Your account is not linked to a hospital.'); setLoading(false); return }

      const { data: hospital, error: hospitalError } = await supabase
        .from('hospitals').select('slug').eq('id', profile.hospital_id).single()
      if (hospitalError) { setError('Hospital error: ' + hospitalError.message); setLoading(false); return }
      if (!hospital?.slug) { setError('Hospital not found.'); setLoading(false); return }

      window.location.href = `/${hospital.slug}/dashboard`
    } catch (err: any) {
      setError('Unexpected error: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: '#fff', borderRadius: 20, padding: '36px 32px',
      boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      width: '100%', maxWidth: 380,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={18} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0A0F1E', letterSpacing: '-0.3px' }}>SterileTrack</div>
          <div style={{ fontSize: 11, color: '#9CA3AF' }}>CSSD Management</div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 600, color: '#0A0F1E', marginBottom: 4, letterSpacing: '-0.4px' }}>
        Welcome back
      </h2>
      <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 24 }}>Sign in to your hospital account</p>

      {error && (
        <div style={{ background: '#FEE2E2', border: '0.5px solid #FCA5A5', color: '#B91C1C', fontSize: 13, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@hospital.com" required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{ width: '100%', padding: '10px 40px 10px 12px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#111827', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: 'none', background: loading ? '#9CA3AF' : 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4 }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 20 }}>
        Need access?{' '}
        <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Access Request"
          style={{ color: '#00B8C2', textDecoration: 'none', fontWeight: 500 }}>
          Contact your administrator
        </a>
      </p>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen]     = useState(false)
  const [scrolled, setScrolled]     = useState(false)
  const [formData, setFormData]     = useState({ name: '', hospital: '', phone: '', email: '', message: '' })
  const [formStatus, setFormStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name || !formData.hospital) return
    setFormStatus('sending')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed')
      setFormStatus('sent')
      setFormData({ name: '', hospital: '', phone: '', email: '', message: '' })
    } catch (err: any) {
      console.error('Contact form error:', err)
      setFormStatus('error')
    }
  }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, sans-serif', color: '#0A0F1E' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10,15,30,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.3s ease', padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={16} color="white" />
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '-0.3px' }}>SterileTrack</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flex: 1 }}>
            {['Features', 'How It Works', 'Pricing', 'Contact'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
                style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}>
                {item}
              </a>
            ))}
          </div>

          <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Demo Request"
            style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', fontSize: 13, fontWeight: 500, padding: '8px 18px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Request Demo
          </a>

          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'none' }}
            className="md-hidden-btn">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* HERO — split layout with login card */}
      <section style={{
        background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1F2D 60%, #0A1A20 100%)',
        minHeight: '100vh', padding: '100px 24px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,201,212,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap', minHeight: 'calc(100vh - 180px)' }}>

          {/* Left — headline */}
          <div style={{ flex: '1 1 400px', position: 'relative' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,201,212,0.1)', border: '0.5px solid rgba(0,201,212,0.3)', borderRadius: 100, padding: '6px 14px', marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C9D4' }} />
              <span style={{ color: '#00C9D4', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em' }}>Now live at Baguio General Hospital</span>
            </div>

            <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 5vw, 60px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-2px', marginBottom: 20 }}>
              Track Every{' '}
              <span style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Instrument.
              </span>
              <br />
              Trust Every{' '}
              <span style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Procedure.
              </span>
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(15px, 1.8vw, 18px)', lineHeight: 1.65, marginBottom: 40, maxWidth: 480 }}>
              Modern CSSD management for Philippine hospitals. Replace paper tags and logbooks with a complete digital chain of custody — from OR to sterilization and back.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Demo Request"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '12px 24px', borderRadius: 10, textDecoration: 'none' }}>
                Request a Demo <ArrowRight size={15} />
              </a>
              <a href="#features"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: 14, padding: '12px 24px', borderRadius: 10, textDecoration: 'none' }}>
                See Features
              </a>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32, marginTop: 48, flexWrap: 'wrap' }}>
              {[{ value: '440+', label: 'Sets tracked' }, { value: '1', label: 'Hospital live' }, { value: '2,800+', label: 'Audit logs' }].map(s => (
                <div key={s.label}>
                  <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #00C9D4, #0088A9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — login card */}
          <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center' }}>
            <LoginCard />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section style={{ background: '#F8F9FB', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#FEE2E2', color: '#B91C1C', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 20 }}>The Problem</div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
            Paper-based CSSD tracking puts patients at risk
          </h2>
          <p style={{ color: '#6B7280', fontSize: 17, lineHeight: 1.7 }}>
            Missing instruments discovered mid-surgery. Sterilization records lost. OR delays from incomplete handovers. When your tracking system is a paper tag and a logbook, accountability ends the moment the pen is set down.
          </p>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-block', background: 'rgba(0,201,212,0.08)', color: '#00B8C2', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2 }}>Everything your CSSD team needs</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{ background: '#F8F9FB', borderRadius: 16, padding: '28px', border: '1px solid #EDEEF0' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16, background: 'linear-gradient(135deg, rgba(0,201,212,0.12), rgba(0,136,169,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <f.icon size={20} color="#00B8C2" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.3px' }}>{f.title}</h3>
                <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ background: '#0A0F1E', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-block', background: 'rgba(0,201,212,0.1)', color: '#00C9D4', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>How It Works</div>
            <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2 }}>The full CSSD cycle — in one system</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff' }}>{step.number}</div>
                  <span style={{ color: '#00C9D4', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{step.label}</span>
                </div>
                <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.3px' }}>{step.title}</h3>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section style={{ background: '#F8F9FB', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, margin: '0 auto 28px', background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={22} color="white" />
          </div>
          <blockquote style={{ fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 500, lineHeight: 1.55, letterSpacing: '-0.3px', color: '#0A0F1E', marginBottom: 28, fontStyle: 'normal' }}>
            "Before SterileTrack, we relied on paper tags that were always incomplete. Now our OR nurses can verify instrument counts in real time. It has made our team more confident and our procedures safer."
          </blockquote>
          <div style={{ color: '#6B7280', fontSize: 14 }}>
            OR Nurse · <strong style={{ color: '#374151' }}>Baguio General Hospital and Medical Center</strong>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-block', background: 'rgba(0,201,212,0.08)', color: '#00B8C2', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 12 }}>Simple, transparent pricing</h2>
            <p style={{ color: '#6B7280', fontSize: 16 }}>All plans include a 14-day free trial. No credit card required.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
            {plans.map((plan, i) => (
              <div key={i} style={{ borderRadius: 16, padding: '28px 24px', background: plan.highlight ? '#0A0F1E' : '#F8F9FB', border: plan.highlight ? '1px solid rgba(0,201,212,0.3)' : '1px solid #EDEEF0', position: 'relative' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', fontSize: 11, fontWeight: 600, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap' }}>Most Popular</div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#6B7280', marginBottom: 6 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', color: plan.highlight ? '#fff' : '#0A0F1E' }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>{plan.sub}</span>
                  </div>
                </div>
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle size={15} color="#00C9D4" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#374151', lineHeight: 1.4 }}>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={`mailto:yolymarorfiano@yahoo.com?subject=SterileTrack ${plan.name} Plan Inquiry`}
                  style={{ display: 'block', textAlign: 'center', padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none', background: plan.highlight ? 'linear-gradient(135deg, #00C9D4, #0088A9)' : 'transparent', border: plan.highlight ? 'none' : '1px solid #D1D5DB', color: plan.highlight ? '#fff' : '#374151' }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT FORM */}
      <section id="contact" style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-block', background: 'rgba(0,201,212,0.08)', color: '#00B8C2', fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>Contact Us</div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 12, lineHeight: 1.2 }}>Request a Demo</h2>
            <p style={{ color: '#6B7280', fontSize: 16 }}>Fill in your details and we will reach out within 24 hours to schedule a walkthrough.</p>
          </div>

          {formStatus === 'sent' ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#F0FDFA', borderRadius: 16, border: '1px solid #CCFBF1' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0F766E', marginBottom: 8 }}>Message received!</h3>
              <p style={{ color: '#0F766E', fontSize: 15 }}>We will contact you within 24 hours to schedule your demo.</p>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Full Name *</label>
                  <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your name" required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#0D1117', boxSizing: 'border-box' as any }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Hospital Name *</label>
                  <input value={formData.hospital} onChange={e => setFormData(f => ({ ...f, hospital: e.target.value }))}
                    placeholder="Your hospital" required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#0D1117', boxSizing: 'border-box' as any }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Phone / Viber</label>
                  <input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                    placeholder="09XX XXX XXXX"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#0D1117', boxSizing: 'border-box' as any }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Email</label>
                  <input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@hospital.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#0D1117', boxSizing: 'border-box' as any }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Message (optional)</label>
                <textarea value={formData.message} onChange={e => setFormData(f => ({ ...f, message: e.target.value }))}
                  placeholder="Tell us about your CSSD setup, number of ORs, current tracking method..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid #E5E7EB', fontSize: 14, outline: 'none', color: '#0D1117', resize: 'vertical', boxSizing: 'border-box' as any }} />
              </div>
              {formStatus === 'error' && (
                <p style={{ color: '#B91C1C', fontSize: 13 }}>Something went wrong. Please email us directly at yolymarorfiano@yahoo.com</p>
              )}
              <button type="submit" disabled={formStatus === 'sending'}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10, border: 'none',
                  background: formStatus === 'sending' ? '#9CA3AF' : 'linear-gradient(135deg, #00C9D4, #0088A9)',
                  color: '#fff', fontSize: 15, fontWeight: 600, cursor: formStatus === 'sending' ? 'not-allowed' : 'pointer',
                }}>
                {formStatus === 'sending' ? 'Sending…' : 'Send Message →'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF' }}>No commitment required · We respond within 24 hours</p>
            </form>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #0A0F1E 0%, #0D2030 100%)', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.2 }}>Ready to modernize your CSSD?</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 36, lineHeight: 1.6 }}>
            Book a 30-minute demo and we will walk you through the full workflow — live, with your own instrument sets.
          </p>
          <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Demo Request"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', color: '#fff', fontWeight: 600, fontSize: 15, padding: '14px 32px', borderRadius: 10, textDecoration: 'none' }}>
            Book a Free Demo <ArrowRight size={16} />
          </a>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 16 }}>No commitment required · Responds within 24 hours</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#060A12', padding: '40px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={13} color="white" />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>SterileTrack</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            © {new Date().getFullYear()} SterileTrack · CSSD Management · Philippines
          </div>
          <a href="mailto:yolymarorfiano@yahoo.com" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            yolymarorfiano@yahoo.com
          </a>
        </div>
      </footer>
    </div>
  )
}
