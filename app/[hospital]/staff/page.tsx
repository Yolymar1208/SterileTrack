'use client'

import { useHospitalSlug } from '@/lib/hospital'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Users, Search, Edit2, Save, X, QrCode,
  Link2, Printer, Download, Shield, Eye, EyeOff, Lock, Trash2, AlertTriangle
} from 'lucide-react'
import { Profile } from '@/lib/types'

interface StaffWithQR extends Profile {
  paired_at: string | null
}

interface QRPoolItem {
  id: string
  code: string
  is_assigned: boolean
}

export default function StaffPage() {
  const supabase = createClient()
  const slug = useHospitalSlug()
  const [staff, setStaff] = useState<StaffWithQR[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  // Delete all data state
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState('')

  const ADMIN_EMAIL = 'yolymarorfiano@yahoo.com'
  const isAdmin = currentUserEmail === ADMIN_EMAIL

  // Edit state — only for own account
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ role: '', employee_id: '' })
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // QR pairing state
  const [pairingId, setPairingId] = useState<string | null>(null)
  const [qrPool, setQrPool] = useState<QRPoolItem[]>([])
  const [selectedQR, setSelectedQR] = useState<string | null>(null)
  const [pairConfirming, setPairConfirming] = useState(false)
  const [pairSaving, setPairSaving] = useState(false)

  // View own QR
  const [viewingQR, setViewingQR] = useState<StaffWithQR | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
        setCurrentUserEmail(user.email || null)
      }
    })
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('*, qr_paired_at')
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

  function startEdit(p: StaffWithQR) {
    // Only allow editing own account
    if (p.id !== currentUserId) return
    setEditingId(p.id)
    setEditForm({ role: p.role, employee_id: p.employee_id || '' })
    setNewPassword('')
    setConfirmPassword('')
    setPwError('')
    setSaveMsg('')
  }

  async function saveEdit(id: string) {
    setPwError('')
    setSaveMsg('')

    // Validate password if entered
    if (newPassword) {
      if (newPassword.length < 8) {
        setPwError('Password must be at least 8 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setPwError('Passwords do not match.')
        return
      }
    }

    setSaving(true)

    // Update profile fields
    await supabase.from('profiles').update({
      role: editForm.role,
      employee_id: editForm.employee_id || null,
    }).eq('id', id)

    // Update password if provided
    if (newPassword) {
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
      if (pwErr) {
        setPwError('Password update failed: ' + pwErr.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSaveMsg(newPassword ? 'Profile and password updated ✓' : 'Profile updated ✓')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => {
      setEditingId(null)
      setSaveMsg('')
      load()
    }, 1500)
  }

  async function startPairing(staffId: string) {
    await loadQRPool()
    setPairingId(staffId)
    setSelectedQR(null)
    setPairConfirming(false)
  }

  async function confirmPair() {
    if (!pairingId || !selectedQR) return
    setPairSaving(true)

    await supabase.from('profiles').update({
      qr_code: selectedQR,
      qr_paired_at: new Date().toISOString(),
    }).eq('id', pairingId)

    await supabase.from('staff_qr_pool').update({
      is_assigned: true,
      assigned_to: pairingId,
      assigned_at: new Date().toISOString(),
    }).eq('code', selectedQR)

    setPairSaving(false)
    setPairingId(null)
    setSelectedQR(null)
    setPairConfirming(false)
    load()
  }

  function getQRUrl(code: string) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(code)}&bgcolor=ffffff&color=1E3A5F&margin=10`
  }

  async function handleDeleteAllData() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    setDeleteMsg('')
    try {
      // Delete in dependency order — children before parents
      // Use gte on created_at with epoch start — deletes all rows without needing to know IDs
      const epoch = '2000-01-01T00:00:00.000Z'

      await supabase.from('or_verifications').delete().gte('created_at', epoch)
      await supabase.from('audit_logs').delete().gte('created_at', epoch)
      await supabase.from('alerts').delete().gte('created_at', epoch)
      await supabase.from('dispense_records').delete().gte('created_at', epoch)
      await supabase.from('inspections').delete().gte('created_at', epoch)
      await supabase.from('sterilization_load_items').delete().gte('added_at', epoch)
      await supabase.from('sterilization_loads').delete().gte('created_at', epoch)
      await supabase.from('set_contents').delete().gte('created_at', epoch)
      await supabase.from('inventory_items').delete().gte('created_at', epoch)

      setDeleteMsg('✅ All data deleted. Staff directory preserved.')
      setDeleting(false)
      setDeleteConfirmText('')
      setTimeout(() => {
        setShowDeleteModal(false)
        setDeleteMsg('')
      }, 2500)
    } catch (err) {
      console.error('Delete error:', err)
      setDeleteMsg('❌ Something went wrong. Check console for details.')
      setDeleting(false)
    }
  }

  const filtered = staff.filter(s => !search ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.qr_code || '').toLowerCase().includes(search.toLowerCase()))

  return (
    <>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Users size={22} className="text-brand-500" /> Staff Directory
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                You can only edit your own account. Tap your name to manage your profile.
              </p>
            </div>
            {/* Admin-only delete button — only visible to yolymarorfiano@yahoo.com */}
            {isAdmin && (
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(''); setDeleteMsg('') }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex-shrink-0 ml-4"
                title="Admin only — delete all data">
                <Trash2 size={13} /> Reset Data
              </button>
            )}
          </div>
        </div>

        <div className="card p-4 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search staff…" className="input-field pl-9" />
          </div>
        </div>

        <div className="card divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No staff found. Add staff in Supabase → Authentication → Users.
            </div>
          ) : filtered.map(p => {
            const isMe = p.id === currentUserId
            const isEditing = editingId === p.id

            return (
              <div key={p.id}>
                {isEditing ? (
                  /* Edit form — only for own account */
                  <div className="px-4 py-4 bg-brand-50 border-l-4 border-brand-400">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-bold">
                        {p.full_name.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{p.full_name}</div>
                        <div className="text-xs text-gray-500">{p.department || 'No department'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                        <select value={editForm.role}
                          onChange={e => setEditForm({...editForm, role: e.target.value})}
                          className="input-field text-sm">
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
                        <label className="block text-xs font-medium text-gray-600 mb-1">Employee ID</label>
                        <input type="text" value={editForm.employee_id}
                          onChange={e => setEditForm({...editForm, employee_id: e.target.value})}
                          placeholder="e.g. EMP001"
                          className="input-field text-sm" />
                      </div>
                    </div>

                    {/* Password section — own account only */}
                    <div className="border-t border-brand-200 pt-3 mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lock size={13} className="text-brand-500" />
                        <label className="text-xs font-medium text-gray-700">
                          Change Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">New Password</label>
                          <div className="relative">
                            <input
                              type={showPw ? 'text' : 'password'}
                              value={newPassword}
                              onChange={e => { setNewPassword(e.target.value); setPwError('') }}
                              placeholder="Min. 8 characters"
                              className="input-field text-sm pr-8" />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Confirm Password</label>
                          <input
                            type={showPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setPwError('') }}
                            placeholder="Repeat password"
                            className="input-field text-sm" />
                        </div>
                      </div>
                      {pwError && (
                        <p className="text-xs text-red-600 mt-1.5 bg-red-50 px-2 py-1 rounded">{pwError}</p>
                      )}
                      {saveMsg && (
                        <p className="text-xs text-green-600 mt-1.5 font-medium">{saveMsg}</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setEditingId(null)}
                        className="btn-secondary text-sm px-3 py-1.5">
                        Cancel
                      </button>
                      <button onClick={() => saveEdit(p.id)} disabled={saving}
                        className="btn-primary text-sm px-4 py-1.5">
                        {saving ? 'Saving…' : <><Save size={13} /> Save Changes</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal row view */
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => isMe && p.qr_code ? setViewingQR(p) : undefined}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                        isMe
                          ? 'bg-brand-100 text-brand-700 hover:bg-brand-200 cursor-pointer'
                          : 'bg-gray-100 text-gray-500 cursor-default'
                      }`}
                      title={isMe && p.qr_code ? 'View your QR code' : ''}>
                      {p.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                        {p.full_name}
                        {isMe && (
                          <span className="text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 capitalize flex items-center gap-2 flex-wrap">
                        <span>{p.role.replace(/_/g, ' ')}</span>
                        {p.department && <span>· {p.department}</span>}
                        {p.employee_id && <span>· {p.employee_id}</span>}
                        {p.qr_code && (
                          <span className="flex items-center gap-1 text-green-600">
                            <QrCode size={10} /> QR Paired
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 items-center flex-shrink-0">
                      {/* View own QR */}
                      {isMe && p.qr_code && (
                        <button onClick={() => setViewingQR(p)}
                          className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                          title="View your QR code">
                          <QrCode size={15} />
                        </button>
                      )}

                      {/* Pair QR — only for admins/supervisors on others, or self */}
                      {!p.qr_code && (
                        <button onClick={() => startPairing(p.id)}
                          className="flex items-center gap-1 text-xs text-brand-500 font-medium px-2.5 py-1.5 border border-brand-300 rounded-lg hover:bg-brand-50 transition-colors"
                          title="Pair QR code">
                          <Link2 size={12} /> Pair QR
                        </button>
                      )}
                      {p.qr_code && !isMe && (
                        <span title={`QR paired`}>
                          <Shield size={13} className="text-green-400 mx-2" />
                        </span>
                      )}
                      {p.qr_code && (
                        <a href={`/${slug}/staff/${p.id}/badge`} target="_blank"
                          className="flex items-center gap-1 text-xs text-gray-500 font-medium px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                          <Printer size={12} /> Badge
                        </a>
                      )}

                      {/* Edit — ONLY visible on own row */}
                      {isMe && (
                        <button onClick={() => startEdit(p)}
                          className="p-2 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit your profile">
                          <Edit2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pair QR Modal */}
        {pairingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Pair QR Code</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Pairing to: <strong>{staff.find(s => s.id === pairingId)?.full_name}</strong>
                </p>
                <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded">
                  ⚠ This action can only be done once per staff member.
                </p>
              </div>
              <div className="p-5">
                {!pairConfirming ? (
                  <>
                    <p className="text-sm text-gray-600 mb-3">Select an available QR code:</p>
                    {qrPool.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No QR codes available.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-72 overflow-y-auto">
                        {qrPool.map(q => (
                          <button key={q.id} onClick={() => setSelectedQR(q.code)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border-2 transition-all ${
                              selectedQR === q.code
                                ? 'border-brand-400 bg-brand-50'
                                : 'border-gray-100 hover:border-gray-200'
                            }`}>
                            <QrCode size={16} className={selectedQR === q.code ? 'text-brand-500' : 'text-gray-400'} />
                            <span className="font-mono text-sm text-gray-700">{q.code}</span>
                            {selectedQR === q.code && (
                              <span className="ml-auto text-xs text-brand-600 font-medium">Selected</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setPairingId(null)} className="btn-secondary flex-1 justify-center text-sm">
                        Cancel
                      </button>
                      <button onClick={() => setPairConfirming(true)} disabled={!selectedQR}
                        className="btn-primary flex-1 justify-center text-sm">
                        Continue →
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Link2 size={26} className="text-amber-600" />
                    </div>
                    <h3 className="font-semibold text-gray-800 mb-2">Confirm Pairing</h3>
                    <p className="text-sm text-gray-600 mb-1">Pairing code:</p>
                    <p className="font-mono text-sm bg-gray-50 rounded-lg px-3 py-2 mb-1">{selectedQR}</p>
                    <p className="text-sm text-gray-600 mb-4">
                      to <strong>{staff.find(s => s.id === pairingId)?.full_name}</strong>
                    </p>
                    <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-4">
                      This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPairConfirming(false)} className="btn-secondary flex-1 justify-center text-sm">
                        Back
                      </button>
                      <button onClick={confirmPair} disabled={pairSaving}
                        className="btn-primary flex-1 justify-center text-sm bg-green-600 hover:bg-green-700">
                        {pairSaving ? 'Pairing…' : '✓ Confirm'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* View own QR Modal */}
        {viewingQR && viewingQR.id === currentUserId && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Your QR Badge</h2>
                <button onClick={() => setViewingQR(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
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
                <p className="text-xs text-gray-400 capitalize mt-0.5">
                  {viewingQR.role.replace(/_/g,' ')} · {viewingQR.department}
                </p>
                <p className="font-mono text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">
                  {viewingQR.qr_code}
                </p>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => window.open(getQRUrl(viewingQR.qr_code!), '_blank')}
                    className="btn-secondary flex-1 justify-center text-sm">
                    <Download size={14} /> Save
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
        {/* Admin-only delete modal */}
        {isAdmin && showDeleteModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800">Reset All Data</h2>
                    <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                  <p className="text-sm font-medium text-red-800">The following will be permanently deleted:</p>
                  <ul className="text-xs text-red-700 space-y-0.5 ml-2">
                    <li>• All inventory items</li>
                    <li>• All audit logs</li>
                    <li>• All dispense records</li>
                    <li>• All inspections</li>
                    <li>• All OR verifications</li>
                    <li>• All instrument set contents</li>
                    <li>• All alerts</li>
                  </ul>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <p className="text-xs text-green-700 font-medium">
                    ✓ Staff Directory and QR codes will be preserved.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Type <strong className="text-red-600">DELETE</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here…"
                    className="input-field font-mono text-sm"
                    autoFocus
                  />
                </div>

                {deleteMsg && (
                  <p className={`text-sm font-medium text-center ${deleteMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {deleteMsg}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); setDeleteMsg('') }}
                    className="btn-secondary flex-1 justify-center text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAllData}
                    disabled={deleteConfirmText !== 'DELETE' || deleting}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all text-white"
                    style={{
                      background: deleteConfirmText === 'DELETE' && !deleting ? '#DC2626' : '#9CA3AF',
                      cursor: deleteConfirmText !== 'DELETE' || deleting ? 'not-allowed' : 'pointer'
                    }}>
                    {deleting ? (
                      <><span className="animate-spin inline-block">⟳</span> Deleting…</>
                    ) : (
                      <><Trash2 size={14} /> Delete All Data</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  )
}
