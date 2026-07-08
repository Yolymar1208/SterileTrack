'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Shield, QrCode, Bell, ClipboardCheck,
  ArrowRight, CheckCircle, ChevronDown,
  Package, History, Users, Menu, X
} from 'lucide-react'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [counts, setCounts] = useState({ sets: 0, hospitals: 0, logs: 0 })
  const countsStarted = useRef(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Count-up animation for stats
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !countsStarted.current) {
        countsStarted.current = true
        animateCount('sets', 440)
        animateCount('hospitals', 3)
        animateCount('logs', 2800)
      }
    })
    const el = document.getElementById('stats-section')
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function animateCount(key: 'sets' | 'hospitals' | 'logs', target: number) {
    const duration = 1800
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCounts(c => ({ ...c, [key]: Math.floor(eased * target) }))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  const features = [
    {
      icon: QrCode,
      title: 'QR-Based Tracking',
      desc: 'Every instrument set gets a unique QR code. Scan to receive, dispense, or verify — no manual entry, no transcription errors.',
    },
    {
      icon: ClipboardCheck,
      title: 'OR Verification',
      desc: 'After dispatch, OR nurses confirm instrument completeness directly in the app. Auto-confirms after 1 hour if no action is taken.',
    },
    {
      icon: Bell,
      title: 'Real-Time Alerts',
      desc: 'Quantity discrepancies, missing instruments, and expiring sterile packs trigger instant alerts — resolved before the next case.',
    },
    {
      icon: History,
      title: 'Permanent Audit Trail',
      desc: 'Every handover, inspection, and sterilization cycle is logged with timestamp and staff name. Always ready for accreditation.',
    },
    {
      icon: Package,
      title: 'Sterilization Workflow',
      desc: 'From decontamination to shelf assignment — the full CSSD cycle in one system. No more sticky notes or paper logbooks.',
    },
    {
      icon: Users,
      title: 'Staff Directory & QR IDs',
      desc: 'Each staff member gets a unique QR badge. Scan to log who received, dispatched, or verified any instrument set.',
    },
  ]

  const steps = [
    {
      number: '01',
      label: 'Receive',
      title: 'Instruments arrive at CSSD',
      desc: 'CSSD staff scans the set QR code, inspects each instrument, records quantities, and logs who returned it from the OR.',
    },
    {
      number: '02',
      label: 'Sterilize',
      title: 'Pack, sterilize, and store',
      desc: 'Sets are packed, sterilization is confirmed, and assigned to a specific shelf. Expiry is tracked automatically.',
    },
    {
      number: '03',
      label: 'Dispense',
      title: 'Release to the OR',
      desc: 'OR nurses scan their QR badge to receive the set. A verification reminder fires — confirmed in app or auto-cleared after 1 hour.',
    },
  ]

  const plans = [
    {
      name: 'Pilot',
      price: 'Free',
      sub: 'For evaluation',
      color: '#00C9D4',
      features: ['Unlimited staff', 'Unlimited sets', 'Full audit trail', 'OR verification', 'Priority support'],
      cta: 'Contact us',
      highlight: false,
    },
    {
      name: 'Starter',
      price: '₱1,500',
      sub: 'per month',
      color: '#00C9D4',
      features: ['Up to 3 staff', 'Up to 50 sets', 'OR verification', 'Alerts & notifications', 'Email support'],
      cta: 'Get started',
      highlight: false,
    },
    {
      name: 'Professional',
      price: '₱3,500',
      sub: 'per month',
      color: '#0A0F1E',
      features: ['Unlimited staff', 'Unlimited sets', 'Full audit trail export', 'Analytics dashboard', 'Priority support'],
      cta: 'Get started',
      highlight: true,
    },
    {
      name: 'Enterprise',
      price: '₱8,000',
      sub: 'per month',
      color: '#00C9D4',
      features: ['Everything in Professional', 'Multi-department support', 'Custom onboarding', 'Dedicated account manager', 'SLA guarantee'],
      cta: 'Contact us',
      highlight: false,
    },
  ]

  return (
    <div style={{ fontFamily: "Inter, -apple-system, sans-serif", color: '#0A0F1E' }}>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(10,15,30,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 24px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={16} color="white" />
            </div>
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 16, letterSpacing: '-0.3px' }}>
              SterileTrack
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 32 }}>
            {['Features', 'How It Works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseOver={e => (e.currentTarget.style.color = '#fff')}
                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}>
                {item}
              </a>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            <a href="/login" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecoration: 'none' }}
              className="hidden md:block">
              Sign in
            </a>
            <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Demo Request"
              style={{
                background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                color: '#fff', fontSize: 13, fontWeight: 500,
                padding: '8px 18px', borderRadius: 8, textDecoration: 'none',
              }}>
              Request Demo
            </a>
            <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{
            background: '#0A0F1E', borderTop: '0.5px solid rgba(255,255,255,0.08)',
            padding: '16px 24px 24px',
          }}>
            {['Features', 'How It Works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                onClick={() => setMenuOpen(false)}
                style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 15, padding: '10px 0', textDecoration: 'none' }}>
                {item}
              </a>
            ))}
            <a href="/login" style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 15, padding: '10px 0', textDecoration: 'none' }}>
              Sign in
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(160deg, #0A0F1E 0%, #0D1F2D 60%, #0A1A20 100%)',
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,201,212,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          {/* Pill badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,201,212,0.1)', border: '0.5px solid rgba(0,201,212,0.3)',
            borderRadius: 100, padding: '6px 14px', marginBottom: 32,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00C9D4' }} />
            <span style={{ color: '#00C9D4', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em' }}>
              Now live at Baguio General Hospital
            </span>
          </div>

          <h1 style={{
            color: '#fff', fontSize: 'clamp(36px, 6vw, 68px)',
            fontWeight: 700, lineHeight: 1.08, letterSpacing: '-2px',
            marginBottom: 24,
          }}>
            Track Every Instrument.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Trust Every Procedure.
            </span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(16px, 2vw, 20px)',
            lineHeight: 1.6, marginBottom: 40, maxWidth: 560, margin: '0 auto 40px',
          }}>
            Modern CSSD management for Philippine hospitals.
            Replace paper tags and logbooks with a complete digital chain of custody — from OR to sterilization and back.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Demo Request"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                color: '#fff', fontWeight: 600, fontSize: 15,
                padding: '14px 28px', borderRadius: 10, textDecoration: 'none',
              }}>
              Request a Demo <ArrowRight size={16} />
            </a>
            <a href="/login"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.8)', fontWeight: 500, fontSize: 15,
                padding: '14px 28px', borderRadius: 10, textDecoration: 'none',
              }}>
              Sign In
            </a>
          </div>

          {/* Scroll indicator */}
          <div style={{ marginTop: 80, display: 'flex', justifyContent: 'center' }}>
            <a href="#features" style={{ color: 'rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Explore</span>
              <ChevronDown size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section id="stats-section" style={{
        background: '#fff', borderTop: '1px solid #F0F0F0',
        padding: '56px 24px',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 40, textAlign: 'center',
        }}>
          {[
            { value: counts.sets + '+', label: 'Instrument sets tracked' },
            { value: counts.hospitals + '', label: 'Hospitals piloting SterileTrack' },
            { value: counts.logs + '+', label: 'Audit log entries created' },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{
                fontSize: 48, fontWeight: 700, letterSpacing: '-2px',
                background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {stat.value}
              </div>
              <div style={{ color: '#6B7280', fontSize: 14, marginTop: 6 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ─────────────────────────────────────── */}
      <section style={{ background: '#F8F9FB', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-block', background: '#FEE2E2', color: '#B91C1C',
            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100,
            letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            The Problem
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 20, lineHeight: 1.2 }}>
            Paper-based CSSD tracking puts patients at risk
          </h2>
          <p style={{ color: '#6B7280', fontSize: 17, lineHeight: 1.7 }}>
            Missing instruments discovered mid-surgery. Sterilization records lost. OR delays from incomplete handovers.
            When your tracking system is a paper tag and a logbook, accountability ends the moment the pen is set down.
          </p>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section id="features" style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(0,201,212,0.08)', color: '#00B8C2',
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100,
              letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Features
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2 }}>
              Everything your CSSD team needs
            </h2>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
          }}>
            {features.map((f, i) => (
              <div key={i} style={{
                background: '#F8F9FB', borderRadius: 16, padding: '28px 28px 24px',
                border: '1px solid #EDEEF0', transition: 'all 0.2s',
              }}
                onMouseOver={e => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(0,201,212,0.3)'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
                }}
                onMouseOut={e => {
                  (e.currentTarget as HTMLDivElement).style.border = '1px solid #EDEEF0'
                  ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                  background: 'linear-gradient(135deg, rgba(0,201,212,0.12), rgba(0,136,169,0.12))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon size={20} color="#00B8C2" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.3px' }}>
                  {f.title}
                </h3>
                <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section id="how-it-works" style={{ background: '#0A0F1E', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(0,201,212,0.1)', color: '#00C9D4',
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100,
              letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              How It Works
            </div>
            <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2 }}>
              The full CSSD cycle — in one system
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {steps.map((step, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {i < steps.length - 1 && (
                  <div className="hidden md:block" style={{
                    position: 'absolute', top: 22, left: '100%',
                    width: '100%', height: 1,
                    background: 'linear-gradient(90deg, rgba(0,201,212,0.4), transparent)',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: '28px 24px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 15, fontWeight: 700, color: '#fff',
                    }}>
                      {step.number}
                    </div>
                    <span style={{ color: '#00C9D4', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {step.label}
                    </span>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.3px' }}>
                    {step.title}
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.65 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ─────────────────────────────────── */}
      <section style={{ background: '#F8F9FB', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 28px',
            background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={22} color="white" />
          </div>
          <blockquote style={{
            fontSize: 'clamp(18px, 2.5vw, 24px)', fontWeight: 500,
            lineHeight: 1.55, letterSpacing: '-0.3px', color: '#0A0F1E',
            marginBottom: 28, fontStyle: 'normal',
          }}>
            "Before SterileTrack, we relied on paper tags that were always incomplete.
            Now our OR nurses can verify instrument counts in real time.
            It's made our team more confident and our procedures safer."
          </blockquote>
          <div style={{ color: '#6B7280', fontSize: 14 }}>
            OR Nurse · <strong style={{ color: '#374151' }}>Baguio General Hospital and Medical Center</strong>
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────── */}
      <section id="pricing" style={{ background: '#fff', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-block', background: 'rgba(0,201,212,0.08)', color: '#00B8C2',
              fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 100,
              letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Pricing
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.2, marginBottom: 12 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: '#6B7280', fontSize: 16 }}>
              All plans include a 14-day free trial. No credit card required.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
            {plans.map((plan, i) => (
              <div key={i} style={{
                borderRadius: 16, padding: '28px 24px',
                background: plan.highlight ? '#0A0F1E' : '#F8F9FB',
                border: plan.highlight ? '1px solid rgba(0,201,212,0.3)' : '1px solid #EDEEF0',
                position: 'relative',
              }}>
                {plan.highlight && (
                  <div style={{
                    position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                    color: '#fff', fontSize: 11, fontWeight: 600,
                    padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap',
                  }}>
                    Most Popular
                  </div>
                )}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#6B7280', marginBottom: 6 }}>
                    {plan.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-1px', color: plan.highlight ? '#fff' : '#0A0F1E' }}>
                      {plan.price}
                    </span>
                    {plan.sub && (
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.4)' : '#9CA3AF' }}>
                        {plan.sub}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle size={15} color="#00C9D4" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#374151', lineHeight: 1.4 }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <a href=`mailto:yolymarorfiano@yahoo.com?subject=SterileTrack - ${plan.name} Plan Inquiry`
                  style={{
                    display: 'block', textAlign: 'center',
                    padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 600,
                    textDecoration: 'none',
                    background: plan.highlight ? 'linear-gradient(135deg, #00C9D4, #0088A9)' : 'transparent',
                    border: plan.highlight ? 'none' : '1px solid #D1D5DB',
                    color: plan.highlight ? '#fff' : '#374151',
                  }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────── */}
      <section style={{
        background: 'linear-gradient(135deg, #0A0F1E 0%, #0D2030 100%)',
        padding: '80px 24px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ color: '#fff', fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-1px', marginBottom: 16, lineHeight: 1.2 }}>
            Ready to modernize your CSSD?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, marginBottom: 36, lineHeight: 1.6 }}>
            Book a 30-minute demo and we'll walk you through the full workflow — live, with your own instrument sets.
          </p>
          <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Demo Request"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              color: '#fff', fontWeight: 600, fontSize: 15,
              padding: '14px 32px', borderRadius: 10, textDecoration: 'none',
            }}>
            Book a Free Demo <ArrowRight size={16} />
          </a>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 16 }}>
            No commitment required · Responds within 24 hours
          </p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer style={{ background: '#060A12', padding: '40px 24px' }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={13} color="white" />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500 }}>SterileTrack</span>
          </div>

          <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>
            © {new Date().getFullYear()} SterileTrack · CSSD Management · Philippines
          </div>

          <a href="mailto:yolymarorfiano@yahoo.com"
            style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            yolymarorfiano@yahoo.com
          </a>
        </div>
      </footer>
    </div>
  )
}
