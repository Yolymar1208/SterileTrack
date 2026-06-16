'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/app/dashboard/layout'
import { createClient } from '@/lib/supabase'
import { BarChart3, Package, TrendingUp, Clock, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { InventoryItem, ItemStatus, STATUS_CONFIG } from '@/lib/types'

const STATUS_COLORS: Record<string, string> = {
  sterile: '#48BB78',
  in_or: '#4299E1',
  decontamination: '#ECC94B',
  assembly: '#9F7AEA',
  sterilization: '#ED8936',
  storage: '#38B2AC',
  missing: '#FC8181',
  damaged: '#F6AD55',
  expired: '#B794F4',
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('inventory_items').select('*').then(({ data }) => {
      setItems(data || [])
      setLoading(false)
    })
  }, [])

  // Status distribution for pie chart
  const statusCounts = Object.keys(STATUS_CONFIG).map(status => {
    const count = items.filter(i => i.status === status).length
    return {
      name: STATUS_CONFIG[status as ItemStatus].label,
      value: count,
      color: STATUS_COLORS[status],
    }
  }).filter(d => d.value > 0)

  // Type distribution for bar chart
  const typeCounts = [
    { name: 'Instrument Sets', count: items.filter(i => i.item_type === 'instrument_set').length },
    { name: 'Sterile Packs', count: items.filter(i => i.item_type === 'sterile_pack').length },
    { name: 'Implants', count: items.filter(i => i.item_type === 'implant').length },
    { name: 'Consumables', count: items.filter(i => i.item_type === 'consumable').length },
    { name: 'Equipment', count: items.filter(i => i.item_type === 'equipment').length },
  ].filter(d => d.count > 0)

  const expiringSoon = items.filter(i =>
    i.expiry_date &&
    new Date(i.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
    i.status !== 'expired'
  )

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 size={22} className="text-brand-500" /> Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Inventory overview and performance metrics</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Items', value: items.length, icon: Package, color: 'text-brand-500 bg-brand-50' },
            { label: 'Sterile Ready', value: items.filter(i => i.status === 'sterile').length, icon: TrendingUp, color: 'text-green-600 bg-green-50' },
            { label: 'Expiring (30d)', value: expiringSoon.length, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Missing / Damaged', value: items.filter(i => ['missing','damaged'].includes(i.status)).length, icon: BarChart3, color: 'text-red-600 bg-red-50' },
          ].map(card => (
            <div key={card.label} className="card p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                <card.icon size={18} />
              </div>
              <div className="text-2xl font-semibold text-gray-800">{loading ? '–' : card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Status distribution */}
          <div className="card p-5">
            <h2 className="font-medium text-gray-800 text-sm mb-4">Status Distribution</h2>
            {!loading && statusCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {statusCounts.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, 'Items']} />
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-300">No data</div>
            )}
          </div>

          {/* Type distribution */}
          <div className="card p-5">
            <h2 className="font-medium text-gray-800 text-sm mb-4">Items by Type</h2>
            {!loading && typeCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4AB8C1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-300">No data</div>
            )}
          </div>
        </div>

        {/* Expiring items table */}
        {expiringSoon.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-gray-800 text-sm">Expiring Within 30 Days</h2>
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {expiringSoon.length} items
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {expiringSoon.sort((a, b) =>
                new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime()
              ).map(item => {
                const daysLeft = Math.ceil((new Date(item.expiry_date!).getTime() - Date.now()) / (1000*60*60*24))
                return (
                  <div key={item.id} className="py-3 flex items-center gap-3">
                    <Package size={15} className="text-gray-400" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.shelf_location || item.location}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-semibold ${daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                        {daysLeft}d left
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(item.expiry_date!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
