'use client'

import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Users, Search, Edit2, Save, X, QrCode, Link2, Printer, Download, Shield, Camera } from 'lucide-react'
import { Profile } from '@/lib/types'
import CameraQRScanner from '@/components/CameraQRScanner'

interface QRPoolItem {
  id: string
  code: string
  is_assigned: boolean
  assigned_to: string | null
}

interface StaffWithQR extends Profile {
  paired_at: string | null
}

export default function StaffPage() {
  const supabase = createClient()
  const [staff, setStaff] = useState<StaffWithQR[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: '', department: '', employee_id: '' })
  const [pairingId, setPairingId] = useState<string | null>(null)
  const [qrPool, setQrPool] = useState<QRPoolItem[]>([])
  const [selectedQR, setSelectedQR] = useState<string | null>(null)
  const [pairConfirming, setPairConfirming] = useState(false)
  const [viewingQR, setViewingQR] = useState<StaffWithQR | null>(null)
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user.id)
    })
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('*, paired_at:qr_paired_at')
      .order('full_name')
    setStaff((data || []) as StaffWithQR[])
    setLoading(false)
  }

  async function loadQRPool() {
    const { data } = await supabase
      .from('staff_qr_pool')
      .select('*')
      .eq('is_assigned', false)
      .order('code')
    setQrPool(data || [])
  }

  async function startPairing(staffId: string) {
    await loadQRPool()
    setPairingId(staffId)
    setSelectedQR(null)
    setPairConfirming(false)
  }

  async function confirmPair() {
    if (!pairingId || !selectedQR) return
    setSaving(true)
    const pool = qrPool.find(q => q.code === selectedQR)
    if (!pool) return

    // Update profile qr_code and paired_at
    await supabase.from('profiles').update({
      qr_code: selectedQR,
      qr_paired_at: new Date().toISOString(),
    }).eq('id', pairingId)

    // Mark pool item as assigned
    await supabase.from('staff_qr_pool').update({
      is_assigned: true,
      assigned_to: pairingId,
      assigned_at: new Date().toISOString(),
    }).eq('code', selectedQR)

    // Log to audit
    const member = staff.find(s => s.id === pairingId)
    await supabase.from('audit_logs').insert({
      item_id: '00000000-0000-0000-0000-000000000000',
      item_name: 'Staff QR Pairing',
      item_qr_code: selectedQR,
      action: 'staff_qr_paired',
      performed_by_id: currentUser,
      performed_by_name: staff.find(s => s.id === currentUser)?.full_name || 'Admin',
      notes: `QR code ${selectedQR} paired to ${member?.full_name}`,
      device_used: 'Web Browser',
    }).catch(() => {}) // non-blocking

    setSaving(false)
    setPairingId(null)
    setSelectedQR(null)
    setPairConfirming(false)
    load()
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('profiles').update({
      full_name: editForm.full_name,
      role: editForm.role,
      department: editForm.department,
      employee_id: editForm.employee_id,
    }).eq('id', id)
    setSaving(false)
    setEditingId(null)
    load()
  }

  // Generate QR code as canvas using simple QR pattern (uses Google Charts API for simplicity)
  function getQRUrl(code: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=1E3A5F&margin=10`
  }

  const filtered = staff.filter(s => !search ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.qr_code || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Users size={22} className="text-brand-500" /> Staff Directory
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff accounts and pair QR badges</p>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…" className="input-field pl-9" />
          </div>
        </div>

        <div className="card divide-y divide-gray-50">
          {loading ? <div className="p-8 text-center text-gray-400">Loading…</div>
          : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No staff found. Add staff in Supabase → Authentication → Users.
            </div>
          ) : filtered.map(p => (
            <div key={p.id}>
              {editingId === p.id ? (
                <div className="px-4 py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Full Name</label>
                      <input value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="input-field text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Role</label>
                      <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="input-field text-sm">
                        <option value="cssd_technician">CSSD Technician</option>
                        <option value="cssd_supervisor">CSSD Supervisor</option>
                        <option value="or_nurse">OR Nurse</option>
                        <option value="or_supervisor">OR Supervisor</option>
                        <option value="infection_control">Infection Control</option>
                        <option value="hospital_admin">Hospital Admin</option>
                        <option value="system_admin">System Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Department</label>
                      <input value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})} className="input-field text-sm" placeholder="e.g. CSSD" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Employee ID</label>
                      <input value={editForm.employee_id || ''} onChange={e => setEditForm({...editForm, employee_id: e.target.value})} className="input-field text-sm" placeholder="e.g. EMP001" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-sm px-3 py-1.5">Cancel</button>
                    <button onClick={() => saveEdit(p.id)} disabled={saving} className="btn-primary text-sm px-3 py-1.5">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => p.id === currentUser && p.qr_code ? setViewingQR(p) : null}
                    className="w-9 h-9 bg-brand-50 rounded-full flex items-center justify-center text-brand-600 text-xs font-bold flex-shrink-0 hover:bg-brand-100 transition-colors"
                    title={p.id === currentUser ? 'View your QR code' : ''}
                  >
                    {p.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                      {p.full_name}
                      {p.id === currentUser && <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded font-medium">You</span>}
                    </div>
                    <div className="text-xs text-gray-400 capitalize flex items-center gap-2">
                      {p.role.replace(/_/g, ' ')}
                      {p.department && <span>· {p.department}</span>}
                      {p.qr_code && (
                        <span className="flex items-center gap-1 text-green-600">
                          <QrCode size={10} /> QR Paired
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 items-center flex-shrink-0">
                    {/* View own QR */}
                    {p.id === currentUser && p.qr_code && (
                      <button onClick={() => setViewingQR(p)}
                        className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                        title="View your QR code">
                        <QrCode size={15} />
                      </button>
                    )}
                    {/* Pair QR */}
                    {!p.qr_code ? (
                      <button onClick={() => startPairing(p.id)}
                        className="flex items-center gap-1 text-xs text-brand-500 font-medium px-2.5 py-1.5 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
                        title="Pair QR code">
                        <Link2 size={12} /> Pair QR
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300 px-2" title={`QR: ${p.qr_code}`}>
                        <Shield size={13} className="text-green-400" />
                      </span>
                    )}
                    {/* Edit */}
                    <button onClick={() => {
                      setEditingId(p.id)
                      setEditForm({ full_name: p.full_name, role: p.role, department: p.department || '', employee_id: p.employee_id || '' })
                    }} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors" title="Edit staff">
                      <Edit2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pair QR Modal */}
        {pairingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Pair QR Code</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pairing QR to: <strong>{staff.find(s => s.id === pairingId)?.full_name}</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded">
                  ⚠ This action can only be done once per staff member.
                </p>
              </div>
              <div className="p-5">
                {!pairConfirming ? (
                  <>
                    <p className="text-sm text-gray-600 mb-3">Select one of the available QR codes:</p>
                    {qrPool.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No QR codes available in the pool.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {qrPool.map(q => (
                          <button key={q.id} onClick={() => setSelectedQR(q.code)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border-2 transition-all ${
                              selectedQR === q.code ? 'border-brand-400 bg-brand-50' : 'border-gray-100 hover:border-gray-200'
                            }`}>
                            <QrCode size={16} className={selectedQR === q.code ? 'text-brand-500' : 'text-gray-400'} />
                            <span className="font-mono text-sm text-gray-700">{q.code}</span>
                            {selectedQR === q.code && <span className="ml-auto text-xs text-brand-600 font-medium">Selected</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setPairingId(null)} className="btn-secondary flex-1 justify-center text-sm">Cancel</button>
                      <button onClick={() => setPairConfirming(true)} disabled={!selectedQR}
                        className="btn-primary flex-1 justify-center text-sm">
                        Continue →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Link2 size={28} className="text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Confirm Pairing</h3>
                    <p className="text-sm text-gray-600 mb-1">
                      You are about to pair:
                    </p>
                    <p className="font-mono text-sm bg-gray-50 rounded-lg px-3 py-2 mb-1 text-gray-800">{selectedQR}</p>
                    <p className="text-sm text-gray-600 mb-4">
                      to <strong>{staff.find(s => s.id === pairingId)?.full_name}</strong>
                    </p>
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                      This cannot be undone. Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPairConfirming(false)} className="btn-secondary flex-1 justify-center text-sm">Back</button>
                      <button onClick={confirmPair} disabled={saving}
                        className="btn-primary flex-1 justify-center text-sm bg-green-600 hover:bg-green-700">
                        {saving ? 'Pairing…' : '✓ Confirm Pair'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View own QR Modal */}
        {viewingQR && viewingQR.id === currentUser && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Your QR Badge</h2>
                <button onClick={() => setViewingQR(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
              <div className="p-5 text-center">
                <div className="bg-white border-2 border-gray-100 rounded-xl p-3 mb-3 inline-block">
                  <img
                    src={getQRUrl(viewingQR.qr_code!)}
                    alt="Your QR Code"
                    width={220}
                    height={220}
                    className="rounded"
                  />
                </div>
                <p className="font-semibold text-gray-800">{viewingQR.full_name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{viewingQR.role.replace(/_/g,' ')} · {viewingQR.department}</p>
                <p className="font-mono text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">{viewingQR.qr_code}</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => window.open(getQRUrl(viewingQR.qr_code!), '_blank')}
                    className="btn-secondary flex-1 justify-center text-sm">
                    <Download size={14} /> Download
                  </button>
                  <button onClick={() => window.print()}
                    className="btn-primary flex-1 justify-center text-sm">
                    <Printer size={14} /> Print
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">Only you can see this QR code.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
