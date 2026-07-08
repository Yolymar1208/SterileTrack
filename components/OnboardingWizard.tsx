'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, ListChecks, CheckCircle, ArrowRight, X } from 'lucide-react'

type Props = {
  hospitalName: string
  slug: string
}

const STEPS = [
  {
    icon: Shield,
    title: 'Welcome to SterileTrack',
    desc: 'Your CSSD management system is ready. Let\'s get you set up in 2 quick steps.',
    action: null,
    actionLabel: null,
  },
  {
    icon: Users,
    title: 'Add your staff',
    desc: 'Go to the Staff Directory to add your CSSD and OR team members. Each gets a unique QR code for tracking.',
    action: 'staff',
    actionLabel: 'Go to Staff Directory',
  },
  {
    icon: ListChecks,
    title: 'Review your instrument sets',
    desc: 'Your instrument sets are pre-loaded. Check the Instrument Sets page to verify the contents match your actual sets.',
    action: 'sets',
    actionLabel: 'Go to Instrument Sets',
  },
]

export default function OnboardingWizard({ hospitalName, slug }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep]       = useState(0)
  const key = `steriletrack_onboarded_${slug}`

  useEffect(() => {
    const done = localStorage.getItem(key)
    if (!done) setVisible(true)
  }, [slug])

  function dismiss() {
    localStorage.setItem(key, 'true')
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      dismiss()
    }
  }

  function goToAction() {
    const current = STEPS[step]
    if (current.action) {
      window.location.href = `/${slug}/${current.action}`
    }
    next()
  }

  if (!visible) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(10,15,30,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420,
        boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
        overflow: 'hidden',
      }}>
        {/* Top accent */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #00C9D4, #0088A9)' }} />

        <div style={{ padding: '28px 28px 24px' }}>
          {/* Close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={dismiss}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(0,201,212,0.12), rgba(0,136,169,0.12))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={26} color="#00B8C2" />
          </div>

          {/* Hospital name badge */}
          {step === 0 && (
            <div style={{
              display: 'inline-block', background: 'rgba(0,201,212,0.08)',
              border: '0.5px solid rgba(0,201,212,0.2)',
              color: '#00B8C2', fontSize: 11, fontWeight: 600,
              padding: '4px 10px', borderRadius: 100, marginBottom: 12,
              letterSpacing: '0.03em',
            }}>
              {hospitalName}
            </div>
          )}

          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0A0F1E', marginBottom: 10, letterSpacing: '-0.4px', lineHeight: 1.25 }}>
            {current.title}
          </h2>
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.65, marginBottom: 28 }}>
            {current.desc}
          </p>

          {/* Step indicators */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                height: 3, flex: 1, borderRadius: 2,
                background: i <= step ? 'linear-gradient(90deg, #00C9D4, #0088A9)' : '#E5E7EB',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {current.action && (
              <button onClick={goToAction}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #00C9D4, #0088A9)',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                {current.actionLabel} <ArrowRight size={15} />
              </button>
            )}
            <button onClick={next}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 10, cursor: 'pointer',
                border: '1px solid #E5E7EB', background: '#fff',
                color: '#6B7280', fontSize: 14, fontWeight: 500,
              }}>
              {isLast ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <CheckCircle size={15} color="#38A169" /> Get started
                </span>
              ) : current.action ? 'Skip for now' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
