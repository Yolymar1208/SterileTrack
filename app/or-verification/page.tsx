'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import {
  ClipboardCheck, Package, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, User
} from 'lucide-react'
import { format, differenceInMinutes } from 'date-fns'

interface PendingVerification {
  dispense_id: string
  item_id: string
  item_name: string
  item_qr_code: string
  or_room: string
  received_by_name: string
  received_by_id: string | null
  dispensed_at: string
  minutes_since_dispense: number
  auto_confirm_deadline: string
  verification_id: string | null
  is_verified: boolean
  is_auto_confirmed: boolean
  contents: { instrument_name: string; quantity: number }[]
}

export default function ORVerificationPage() {
  const supabase = createClient()
  const [pending, setPending] = useState<PendingVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [discrepancyNotes, setDiscrepancyNotes] = useState<Record<string, string>>({})
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('full_name').eq('id', user.id).single()
        .then(({ data }) => {
          const cu = { id: user.id, name: data?.full_name || user.email?.split('@')[0] || 'Staff' }
          setCurrentUser(cu)
          loadPending(cu.id)
        })
    })

    const interval = setInterval(() => {
      if (currentUser) checkAutoConfirm()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadPending(userId: string) {
    setLoading(true)

    // Only get dispense records where this user is the receiver
    const { data: myDispenses } = await supabase
      .from('dispense_records')
      .select('*')
      .eq('received_by_id', userId)
      .order('created_at', { ascending: false })

    if (!myDispenses || myDispenses.length === 0) {
      setPending([])
      setLoading(false)
      return
    }

    const result: PendingVerification[] = []

    for (const dr of myDispenses) {
      // Check item is still dispensed
      const { data: itemData } = await supabase
        .from('inventory_items')
        .select('status, name, qr_code')
        .eq('id', dr.item_id)
        .single()

      if (!itemData || itemData.status !== 'dispensed') continue

      // Check if already verified
      const { data: verif } = await supabase
        .from('or_verifications')
        .select('*')
        .eq('dispense_record_id', dr.id)
        .single()

      const dispensedAt = new Date(dr.created_at)
      const minutesSince = differenceInMinutes(new Date(), dispensedAt)
      const deadline = new Date(dispensedAt.getTime() + 60 * 60 * 1000)

      // Get contents
      const { data: contents } = await supabase
        .from('set_contents')
        .select('instrument_name, quantity')
        .eq('set_id', dr.item_id)
        .order('sort_order')

      result.push({
        dispense_id: dr.id,
        item_id: dr.item_id,
        item_name: dr.item_name,
        item_qr_code: dr.item_qr_code,
        or_room: dr.or_room,
        received_by_name: dr.received_by_name,
        received_by_id: dr.received_by_id,
        dispensed_at: dr.created_at,
        minutes_since_dispense: minutesSince,
        auto_confirm_deadline: deadline.toISOString(),
        verification_id: verif?.id || null,
        is_verified: !!verif?.verified_at,
        is_auto_confirmed: !!verif?.is_auto_confirmed,
        contents: contents || [],
      })
    }

    setPending(result)
    setLoading(false)
  }

  async function checkAutoConfirm() {
    const now = new Date()
    for (const item of pending) {
      if (item.is_verified) continue
      const deadline = new Date(item.auto_confirm_deadline)
      if (now > deadline && !item.verification_id) {
        await autoConfirm(item)
      }
    }
    if (currentUser) loadPending(currentUser.id)
  }

  async function autoConfirm(item: PendingVerification) {
    await supabase.from('or_verifications').insert({
      item_id: item.item_id,
      item_name: item.item_name,
      item_qr_code: item.item_qr_code,
      dispense_record_id: item.dispense_id,
      dispensed_at: item.dispensed_at,
      or_room: item.or_room,
      received_by_name: item.received_by_name,
      received_by_id: item.received_by_id,
      is_complete: true,
      is_auto_confirmed: true,
      auto_confirm_deadline: item.auto_confirm_deadline,
      verified_at: new Date().toISOString(),
      verified_by_name: 'System (auto-confirmed)',
    })

    await supabase.from('audit_logs').insert({
      item_id: item.item_id,
      item_name: item.item_name,
      item_qr_code: item.item_qr_code,
      action: 'or_verification_auto_confirmed',
      performed_by_id: null,
      performed_by_name: 'System',
      location: item.or_room,
      device_used: 'Automated',
      notes: `Auto-confirmed complete — no response within 1 hour. Received by: ${item.received_by_name}`,
    })
  }

  async function confirmComplete(item: PendingVerification, isComplete: boolean) {
    if (!currentUser) return
    setVerifying(item.dispense_id)
    const notes = discrepancyNotes[item.dispense_id] || null

    await supabase.from('or_verifications').insert({
      item_id: item.item_id,
      item_name: item.item_name,
      item_qr_code: item.item_qr_code,
      dispense_record_id: item.dispense_id,
      dispensed_at: item.dispensed_at,
      or_room: item.or_room,
      received_by_name: item.received_by_name,
      received_by_id: item.received_by_id,
      verified_by_id: currentUser.id,
      verified_by_name: currentUser.name,
      is_complete: isComplete,
      is_auto_confirmed: false,
      discrepancy_notes: notes,
      auto_confirm_deadline: item.auto_confirm_deadline,
      verified_at: new Date().toISOString(),
    })

    await supabase.from('audit_logs').insert({
      item_id: item.item_id,
      item_name: item.item_name,
      item_qr_code: item.item_qr_code,
      action: isComplete ? 'or_verification_confirmed_complete' : 'or_verification_discrepancy_reported',
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.name,
      location: item.or_room,
      device_used: 'Web Browser',
      notes: isComplete
        ? `Contents confirmed complete by ${currentUser.name} at ${item.or_room}`
        : `Discrepancy reported by ${currentUser.name}: ${notes || 'No details'}`,
    })

    if (!isComplete && notes) {
      await supabase.from('alerts').insert({
        alert_type: 'or_discrepancy',
        severity: 'critical',
        title: `OR discrepancy reported: ${item.item_name}`,
        body: `Reported by ${currentUser.name} at ${item.or_room}: ${notes}`,
        item_id: item.item_id,
        item_name: item.item_name,
      })
    }

    setVerifying(null)
    setExpandedId(null)
    loadPending(currentUser.id)
  }

  const unverified = pending.filter(p => !p.is_verified)
  const verified = pending.filter(p => p.is_verified)

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardCheck size={22} className="text-brand-500" />
            OR Verification
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Confirm completeness of instrument sets received by you
          </p>
          {currentUser && (
            <p className="text-xs text-brand-600 mt-0.5 flex items-center gap-1">
              <User size={11} /> Showing sets received by: <strong>{currentUser.name}</strong>
            </p>
          )}
        </div>

        {/* Info banner */}
        <div className="card p-4 mb-4 bg-amber-50 border border-amber-200">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">1-Hour Confirmation Window</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Please confirm completeness of each set within <strong>1 hour</strong> of receiving it.
                If no action is taken, the system will automatically record it as complete.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-400">
            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
            Loading your items…
          </div>
        ) : unverified.length === 0 && verified.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Nothing to verify</p>
            <p className="text-sm text-gray-400 mt-1">
              No instrument sets have been dispensed to you yet.
            </p>
          </div>
        ) : unverified.length === 0 ? (
          <div className="card p-8 text-center mb-4">
            <CheckCircle2 size={36} className="text-green-400 mx-auto mb-3" />
            <p className="font-medium text-gray-600">All your sets are verified! 🎉</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            <h2 className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              Pending Your Verification ({unverified.length})
            </h2>
            {unverified.map(item => {
              const isExpanded = expandedId === item.dispense_id
              const minutesLeft = 60 - item.minutes_since_dispense
              const isUrgent = minutesLeft < 15
              const isOverdue = minutesLeft <= 0

              return (
                <div key={item.dispense_id}
                  className={`card overflow-hidden border ${isOverdue ? 'border-red-200' : isUrgent ? 'border-amber-200' : 'border-gray-100'}`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.dispense_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package size={17} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">{item.item_name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span>📍 {item.or_room}</span>
                        <span>Dispensed {format(new Date(item.dispensed_at), 'h:mm a')}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className={`text-xs font-bold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'}`}>
                        {isOverdue ? 'OVERDUE' : `${minutesLeft}min left`}
                      </div>
                      {isExpanded
                        ? <ChevronUp size={15} className="text-gray-400 ml-auto mt-1" />
                        : <ChevronDown size={15} className="text-gray-400 ml-auto mt-1" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 p-4 space-y-4">
                      {item.contents.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Expected contents:</p>
                          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                            {item.contents.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                <span className="text-xs font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600 flex-shrink-0">
                                  ×{c.quantity}
                                </span>
                                <span className="text-xs text-gray-700 truncate">{c.instrument_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Discrepancy notes <span className="text-gray-400">(required if reporting a problem)</span>
                        </label>
                        <textarea
                          value={discrepancyNotes[item.dispense_id] || ''}
                          onChange={e => setDiscrepancyNotes(n => ({ ...n, [item.dispense_id]: e.target.value }))}
                          placeholder="e.g. 1× Mayo Scissors missing…"
                          rows={2}
                          className="input-field resize-none text-sm"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmComplete(item, false)}
                          disabled={verifying === item.dispense_id || !discrepancyNotes[item.dispense_id]?.trim()}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                          {verifying === item.dispense_id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <AlertTriangle size={14} />}
                          Report Discrepancy
                        </button>
                        <button
                          onClick={() => confirmComplete(item, true)}
                          disabled={verifying === item.dispense_id}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5">
                          {verifying === item.dispense_id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <CheckCircle2 size={14} />}
                          All Complete ✓
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Verified items */}

      </div>
    </AppLayout>
  )
}
