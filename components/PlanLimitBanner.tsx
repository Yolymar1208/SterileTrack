'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useHospitalSlug } from '@/lib/hospital'
import { AlertTriangle, Clock, X, ArrowRight } from 'lucide-react'

type BannerType = 'trial' | 'limit' | 'expired' | null

type PlanInfo = {
  planName: string
  status: string
  trialEndsAt: string | null
  maxStaff: number | null
  maxSets: number | null
  currentStaff: number
  currentSets: number
}

export default function PlanLimitBanner() {
  const supabase = createClient()
  const slug = useHospitalSlug()
  const [bannerType, setBannerType] = useState<BannerType>(null)
  const [planInfo, setPlanInfo]     = useState<PlanInfo | null>(null)
  const [dismissed, setDismissed]   = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('hospital_id')
        .eq('id', user.id)
        .single()
      if (!profile?.hospital_id) return

      const { data: hospital } = await supabase
        .from('hospitals')
        .select('status, trial_ends_at, plan:plans(name, max_staff, max_sets)')
        .eq('id', profile.hospital_id)
        .single()
      if (!hospital) return

      const plan = (hospital.plan as any)
      const planName  = plan?.name || 'Starter'
      const maxStaff  = plan?.max_staff || null
      const maxSets   = plan?.max_sets || null

      // Count current staff and sets
      const [{ count: staffCount }, { count: setsCount }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('hospital_id', profile.hospital_id),
        supabase.from('inventory_items').select('id', { count: 'exact', head: true }).eq('hospital_id', profile.hospital_id).eq('item_type', 'instrument_set'),
      ])

      const info: PlanInfo = {
        planName,
        status: hospital.status,
        trialEndsAt: hospital.trial_ends_at,
        maxStaff,
        maxSets,
        currentStaff: staffCount || 0,
        currentSets:  setsCount || 0,
      }
      setPlanInfo(info)

      // Determine banner type
      if (hospital.status === 'trial' && hospital.trial_ends_at) {
        const daysLeft = Math.ceil((new Date(hospital.trial_ends_at).getTime() - Date.now()) / 86400000)
        if (daysLeft <= 7 && daysLeft > 0) {
          setBannerType('trial')
          return
        }
      }

      // Check limits
      const nearStaffLimit = maxStaff && (staffCount || 0) >= maxStaff * 0.9
      const nearSetsLimit  = maxSets  && (setsCount || 0)  >= maxSets  * 0.9
      if (nearStaffLimit || nearSetsLimit) {
        setBannerType('limit')
      }
    }
    check()
  }, [slug])

  if (!bannerType || dismissed || !planInfo) return null

  const daysLeft = planInfo.trialEndsAt
    ? Math.ceil((new Date(planInfo.trialEndsAt).getTime() - Date.now()) / 86400000)
    : null

  const configs = {
    trial: {
      bg: '#FEF3C7', border: '#FDE68A', icon: Clock, iconColor: '#D97706',
      title: `Trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
      body: 'Activate your plan to continue using SterileTrack without interruption.',
    },
    limit: {
      bg: '#FEE2E2', border: '#FCA5A5', icon: AlertTriangle, iconColor: '#DC2626',
      title: `Approaching ${planInfo.planName} plan limits`,
      body: `${planInfo.maxStaff ? `${planInfo.currentStaff}/${planInfo.maxStaff} staff` : ''} ${planInfo.maxSets ? `· ${planInfo.currentSets}/${planInfo.maxSets} sets` : ''}`.trim(),
    },
    expired: {
      bg: '#FEE2E2', border: '#FCA5A5', icon: AlertTriangle, iconColor: '#DC2626',
      title: 'Trial expired',
      body: 'Your trial has ended. Contact us to activate your account.',
    },
  }

  const cfg = configs[bannerType]
  const Icon = cfg.icon

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '0 16px 12px', flexShrink: 0,
    }}>
      <Icon size={16} style={{ color: cfg.iconColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0F1E' }}>{cfg.title} </span>
        <span style={{ fontSize: 12, color: '#6B7280' }}>{cfg.body}</span>
      </div>
      <a href="mailto:yolymarorfiano@yahoo.com?subject=SterileTrack Plan Upgrade"
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: cfg.iconColor, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
        Upgrade <ArrowRight size={11} />
      </a>
      <button onClick={() => setDismissed(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 2, flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  )
}
