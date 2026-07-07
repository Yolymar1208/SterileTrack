'use client'

import { useParams } from 'next/navigation'

/**
 * Returns the hospital slug from the current URL.
 * Use this in any page under /[hospital]/ to get the current hospital.
 *
 * Example: /bghmc/dashboard → returns 'bghmc'
 */
export function useHospitalSlug(): string {
  const params = useParams()
  return (params?.hospital as string) || ''
}

/**
 * Builds a hospital-scoped URL path.
 * Example: hospitalPath('bghmc', 'dashboard') → '/bghmc/dashboard'
 */
export function hospitalPath(slug: string, page: string): string {
  return `/${slug}/${page}`
}

/**
 * Hospital plan feature flags.
 * Use this to conditionally show/hide features based on plan.
 */
export const PLAN_FEATURES: Record<string, {
  maxStaff: number | null
  maxSets: number | null
  hasAuditExport: boolean
  hasAnalytics: boolean
  hasOrVerification: boolean
}> = {
  Pilot: {
    maxStaff: null,
    maxSets: null,
    hasAuditExport: true,
    hasAnalytics: true,
    hasOrVerification: true,
  },
  Starter: {
    maxStaff: 3,
    maxSets: 50,
    hasAuditExport: false,
    hasAnalytics: false,
    hasOrVerification: true,
  },
  Professional: {
    maxStaff: null,
    maxSets: null,
    hasAuditExport: true,
    hasAnalytics: true,
    hasOrVerification: true,
  },
  Enterprise: {
    maxStaff: null,
    maxSets: null,
    hasAuditExport: true,
    hasAnalytics: true,
    hasOrVerification: true,
  },
}
