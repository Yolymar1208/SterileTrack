'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { Package, ArrowLeft, Clock, User, MapPin, Tag, Calendar, QrCode } from 'lucide-react'
import { InventoryItem, AuditLog, STATUS_CONFIG, ACTION_LABELS } from '@/lib/types'
import { format } from 'date-fns'

export default function ItemDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: itemData } = await supabase
        .from('inventory_items').select('*').eq('id', id).single()
      setItem(itemData)
      const { data: logData } = await supabase
        .from('audit_logs').select('*').eq('item_id', id).order('created_at', { ascending: false })
      setLogs(logData || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <AppLayout><div className="p-8 text-center text-gray-400">Loading…</div></AppLayout>
  if (!item) return <AppLayout><div className="p-8 text-center text-gray-400">Item not found.</div></AppLayout>

  const cfg = STATUS_CONFIG[item.status]
  const isExpiringSoon = item.expiry_date &&
    new Date(item.expiry_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Link href="/inventory" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5">
          <ArrowLeft size={15} /> Back to Inventory
        </Link>

        {/* Item card */}
        <div className="card p-5 mb-4">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
              <Package size={24} className="text-brand-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-lg font-semibold text-gray-800">{item.name}</h1>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full status-${item.status}`}>
                  {cfg.label}
                </span>
                {isExpiringSoon && (
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                    Expires soon
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <InfoField icon={QrCode} label="QR Code" value={item.qr_code} mono />
            <InfoField icon={Tag} label="Type" value={item.item_type.replace(/_/g, ' ')} />
            <InfoField icon={MapPin} label="Location" value={item.location || '—'} />
            {item.shelf_location && <InfoField icon={Package} label="Shelf" value={item.shelf_location} />}
            {item.sterilization_date && (
              <InfoField icon={Clock} label="Sterilized On"
                value={format(new Date(item.sterilization_date), 'MMM d, yyyy h:mm a')} />
            )}
            {item.expiry_date && (
              <InfoField icon={Calendar} label="Expiry"
                value={format(new Date(item.expiry_date), 'MMM d, yyyy')}
                valueColor={isExpiringSoon ? 'text-amber-600' : undefined} />
            )}
            {item.last_user_name && <InfoField icon={User} label="Last Updated By" value={item.last_user_name} />}
          </div>

          <div className="mt-5 flex gap-3">
            <Link href={`/scan?code=${item.qr_code}`} className="btn-primary text-sm px-4 py-2">
              <QrCode size={14} /> Scan This Item
            </Link>
          </div>
        </div>

        {/* Chain of custody */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-brand-500" /> Chain of Custody
          </h2>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No history recorded yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-100" />
              <div className="space-y-4">
                {logs.map((log, i) => (
                  <div key={log.id} className="flex gap-4 relative">
                    <div className="w-10 h-10 bg-brand-50 border-2 border-white rounded-full flex items-center justify-center flex-shrink-0 z-10">
                      <div className="w-2.5 h-2.5 bg-brand-400 rounded-full" />
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="font-medium text-sm text-gray-800">
                        {ACTION_LABELS[log.action] || log.action}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><User size={11} />{log.performed_by_name}</span>
                        {log.location && <span className="flex items-center gap-1"><MapPin size={11} />{log.location}</span>}
                        <span className="flex items-center gap-1"><Clock size={11} />{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {log.notes && (
                        <p className="text-xs text-gray-400 mt-1 bg-gray-50 px-2 py-1 rounded-lg italic">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

function InfoField({ icon: Icon, label, value, mono, valueColor }: {
  icon: any; label: string; value: string; mono?: boolean; valueColor?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        <Icon size={12} /> {label}
      </div>
      <p className={`text-sm font-medium text-gray-700 ${mono ? 'font-mono' : ''} ${valueColor || ''}`}>
        {value}
      </p>
    </div>
  )
}
