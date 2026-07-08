'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useHospitalSlug } from '@/lib/hospital'
import { FileText, Printer, ArrowLeft, Calendar, Shield } from 'lucide-react'
import Link from 'next/link'

type ReportData = {
  hospital: { name: string; address: string | null; plan: string }
  period: { from: string; to: string }
  generatedBy: string
  generatedAt: string
  summary: {
    totalProcessed: number
    totalDispensed: number
    totalReceived: number
    totalAlerts: number
    totalAlertsResolved: number
    totalAuditLogs: number
  }
  alertBreakdown: { type: string; count: number }[]
  staffActivity: { name: string; count: number }[]
  setStatus: { status: string; count: number }[]
  recentAlerts: { title: string; body: string; created_at: string; is_resolved: boolean }[]
}

const STATUS_LABELS: Record<string, string> = {
  sterile:   'Sterile (Ready)',
  dispensed: 'At OR',
  received:  'Received at CSSD',
  packed:    'Packed for Sterilization',
  in_or:     'In OR',
  missing:   'Missing',
  damaged:   'Damaged',
  expired:   'Expired',
  storage:   'In Storage',
}

const ALERT_LABELS: Record<string, string> = {
  quantity_discrepancy: 'Quantity Discrepancy',
  or_discrepancy:       'OR Discrepancy',
  missing_item:         'Missing Item',
  expiring_soon:        'Expiring Soon',
  damaged_item:         'Damaged Item',
}

export default function ReportsPage() {
  const supabase  = createClient()
  const slug      = useHospitalSlug()
  const params    = useParams()

  // Default: current month
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo]     = useState(today)
  const [loading, setLoading]   = useState(false)
  const [report, setReport]     = useState<ReportData | null>(null)
  const [error, setError]       = useState('')
  const printRef                = useRef<HTMLDivElement>(null)

  async function generateReport() {
    setLoading(true); setError(''); setReport(null)

    try {
      const fromTs = `${dateFrom}T00:00:00`
      const toTs   = `${dateTo}T23:59:59`

      // Get hospital info
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated'); setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, hospital_id, hospitals(name, address, plan:plans(name))')
        .eq('id', user.id)
        .single()

      const hospitalName = (profile?.hospitals as any)?.name || 'Unknown Hospital'
      const hospitalAddress = (profile?.hospitals as any)?.address || ''
      const planName = (profile?.hospitals as any)?.plan?.name || 'Starter'
      const generatedBy = profile?.full_name || 'Staff'

      // Audit logs in range
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('action, performed_by_name, created_at')
        .gte('created_at', fromTs)
        .lte('created_at', toTs)
        .order('created_at', { ascending: false })

      const totalAuditLogs = logs?.length || 0

      // Count by action
      const processed  = logs?.filter(l => l.action === 'packed_for_sterilization').length || 0
      const dispensed  = logs?.filter(l => l.action === 'dispensed_to_or' || l.action === 'released_to_or').length || 0
      const received   = logs?.filter(l => l.action === 'received_at_cssd').length || 0

      // Staff activity
      const staffCounts: Record<string, number> = {}
      logs?.forEach(l => {
        if (l.performed_by_name && l.performed_by_name !== 'System') {
          staffCounts[l.performed_by_name] = (staffCounts[l.performed_by_name] || 0) + 1
        }
      })
      const staffActivity = Object.entries(staffCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      // Alerts in range
      const { data: alerts } = await supabase
        .from('alerts')
        .select('alert_type, is_resolved, title, body, created_at')
        .gte('created_at', fromTs)
        .lte('created_at', toTs)
        .order('created_at', { ascending: false })

      const totalAlerts         = alerts?.length || 0
      const totalAlertsResolved = alerts?.filter(a => a.is_resolved).length || 0

      // Alert breakdown by type
      const alertTypeCounts: Record<string, number> = {}
      alerts?.forEach(a => {
        alertTypeCounts[a.alert_type] = (alertTypeCounts[a.alert_type] || 0) + 1
      })
      const alertBreakdown = Object.entries(alertTypeCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => ({ type, count }))

      // Recent alerts (up to 10)
      const recentAlerts = (alerts || []).slice(0, 10).map(a => ({
        title: a.title,
        body: a.body,
        created_at: a.created_at,
        is_resolved: a.is_resolved,
      }))

      // Current set status
      const { data: items } = await supabase
        .from('inventory_items')
        .select('status')
        .eq('item_type', 'instrument_set')

      const statusCounts: Record<string, number> = {}
      items?.forEach(i => {
        statusCounts[i.status] = (statusCounts[i.status] || 0) + 1
      })
      const setStatus = Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([status, count]) => ({ status, count }))

      setReport({
        hospital: { name: hospitalName, address: hospitalAddress, plan: planName },
        period: { from: dateFrom, to: dateTo },
        generatedBy,
        generatedAt: new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' }),
        summary: { totalProcessed: processed, totalDispensed: dispensed, totalReceived: received, totalAlerts, totalAlertsResolved, totalAuditLogs },
        alertBreakdown,
        staffActivity,
        setStatus,
        recentAlerts,
      })
    } catch (err: any) {
      setError('Error generating report: ' + err.message)
    }

    setLoading(false)
  }

  function handlePrint() {
    window.print()
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-PH', { dateStyle: 'medium' })
  }

  return (
    <div>
      {/* Controls - hidden on print */}
      <div className="print-hidden p-4 md:p-6 max-w-3xl mx-auto">
        <Link href={`/${slug}/dashboard`} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <FileText size={22} className="text-brand-500" /> Activity Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">Generate a printable summary for your CSSD administrator</p>
        </div>

        <div className="card p-5 mb-4">
          <h2 className="font-medium text-gray-800 text-sm mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-brand-500" /> Select Date Range
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="input-field text-sm" />
            </div>
          </div>

          {/* Quick range buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { label: 'This Week', days: 7 },
              { label: 'This Month', days: 30 },
              { label: 'Last 3 Months', days: 90 },
            ].map(r => (
              <button key={r.label} onClick={() => {
                const to = new Date()
                const from = new Date()
                from.setDate(from.getDate() - r.days)
                setDateFrom(from.toISOString().split('T')[0])
                setDateTo(to.toISOString().split('T')[0])
              }}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                {r.label}
              </button>
            ))}
          </div>

          <button onClick={generateReport} disabled={loading}
            className="btn-primary w-full justify-center text-sm"
            style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-100 mb-4">{error}</div>
        )}

        {report && (
          <div className="flex justify-end mb-4">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #00C9D4, #0088A9)' }}>
              <Printer size={15} /> Print / Save as PDF
            </button>
          </div>
        )}
      </div>

      {/* PRINTABLE REPORT */}
      {report && (
        <div id="report-content" ref={printRef} style={{
          maxWidth: 760, margin: '0 auto', padding: '32px 40px',
          fontFamily: 'Arial, sans-serif', color: '#0A0F1E',
          background: '#fff',
        }}>

          {/* Report Header */}
          <div style={{ borderBottom: '2px solid #00C9D4', paddingBottom: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00C9D4, #0088A9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} color="white" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#0A0F1E' }}>SterileTrack</div>
                    <div style={{ fontSize: 10, color: '#6B7280' }}>CSSD Management System</div>
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0A0F1E', marginBottom: 4 }}>
                  CSSD Activity Report
                </div>
                <div style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{report.hospital.name}</div>
                {report.hospital.address && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{report.hospital.address}</div>
                )}
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#6B7280' }}>
                <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Report Period</div>
                <div>{formatDate(report.period.from)} — {formatDate(report.period.to)}</div>
                <div style={{ marginTop: 8, fontWeight: 600, color: '#374151' }}>Generated By</div>
                <div>{report.generatedBy}</div>
                <div style={{ marginTop: 8, fontWeight: 600, color: '#374151' }}>Generated At</div>
                <div>{report.generatedAt}</div>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Summary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {[
                { label: 'Sets Processed', value: report.summary.totalProcessed, note: 'Packed for sterilization' },
                { label: 'Sets Dispensed', value: report.summary.totalDispensed, note: 'Released to OR' },
                { label: 'Sets Received', value: report.summary.totalReceived, note: 'Returned from OR' },
                { label: 'Alerts Raised', value: report.summary.totalAlerts, note: 'During this period' },
                { label: 'Alerts Resolved', value: report.summary.totalAlertsResolved, note: `${report.summary.totalAlerts > 0 ? Math.round(report.summary.totalAlertsResolved / report.summary.totalAlerts * 100) : 0}% resolution rate` },
                { label: 'Total Activities', value: report.summary.totalAuditLogs, note: 'Audit log entries' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#F8F9FB', borderRadius: 10, padding: '14px 16px', border: '1px solid #EDEEF0' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#00B8C2', letterSpacing: '-0.5px' }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{s.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Two column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

            {/* Staff Activity */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Top Staff Activity
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F8F9FB' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Staff Name</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Activities</th>
                  </tr>
                </thead>
                <tbody>
                  {report.staffActivity.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px 10px', color: '#9CA3AF', textAlign: 'center' }}>No activity in this period</td></tr>
                  ) : report.staffActivity.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{s.name}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#00B8C2' }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Alert Breakdown */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Alert Breakdown
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F8F9FB' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Type</th>
                    <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {report.alertBreakdown.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px 10px', color: '#9CA3AF', textAlign: 'center' }}>No alerts in this period</td></tr>
                  ) : report.alertBreakdown.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>{ALERT_LABELS[a.type] || a.type}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#E53E3E' }}>{a.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instrument Set Status */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Current Instrument Set Status
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F8F9FB' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {report.setStatus.map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '8px 10px', color: '#374151' }}>{STATUS_LABELS[s.status] || s.status}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent Alerts */}
          {report.recentAlerts.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Alerts Log (Most Recent 10)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: '#F8F9FB' }}>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Alert</th>
                    <th style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Date</th>
                    <th style={{ textAlign: 'center', padding: '8px 10px', fontWeight: 600, color: '#6B7280', borderBottom: '1px solid #EDEEF0' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentAlerts.map((a, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '8px 10px', color: '#374151' }}>
                        <div style={{ fontWeight: 500 }}>{a.title}</div>
                        <div style={{ color: '#9CA3AF', fontSize: 10, marginTop: 1 }}>{a.body}</div>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {new Date(a.created_at).toLocaleDateString('en-PH', { dateStyle: 'short' })}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: a.is_resolved ? '#C6F6D5' : '#FED7D7', color: a.is_resolved ? '#276749' : '#9B2C2C' }}>
                          {a.is_resolved ? 'Resolved' : 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div style={{ borderTop: '1px solid #EDEEF0', paddingTop: 16, marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>
              Generated by SterileTrack · steriletrak.com
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>
              {report.hospital.plan} Plan · {report.generatedAt}
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .print-hidden { display: none !important; }
          body > div > div { display: none !important; }
          #report-content { display: block !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; z-index: 9999 !important; background: white !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 0.5in; size: A4 portrait; }
          table { page-break-inside: auto; width: 100%; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  )
}
