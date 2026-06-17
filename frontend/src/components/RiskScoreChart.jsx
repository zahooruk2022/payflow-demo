import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Activity } from 'lucide-react'

const BUCKETS = [
  { label: '0–19',   key: 'clean',    color: '#10b981', title: 'Clean' },
  { label: '20–39',  key: 'low',      color: '#3b82f6', title: 'Low' },
  { label: '40–59',  key: 'medium',   color: '#f59e0b', title: 'Medium' },
  { label: '60–79',  key: 'high',     color: '#f97316', title: 'High' },
  { label: '80–100', key: 'critical', color: '#ef4444', title: 'Critical' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-white dark:bg-[#141e35] border border-slate-200 dark:border-white/10 shadow-lg">
      <p className="text-slate-400 mb-0.5">Risk {label}</p>
      <p className="font-semibold text-slate-900 dark:text-white">{payload[0].value} transactions</p>
    </div>
  )
}

export default function RiskScoreChart({ transactions }) {
  const data = useMemo(() => {
    const counts = { clean: 0, low: 0, medium: 0, high: 0, critical: 0 }
    ;(transactions ?? []).forEach(t => {
      const s = t.riskScore ?? 0
      if (s <= 19)      counts.clean++
      else if (s <= 39) counts.low++
      else if (s <= 59) counts.medium++
      else if (s <= 79) counts.high++
      else              counts.critical++
    })
    return BUCKETS.map(b => ({ ...b, count: counts[b.key] }))
  }, [transactions])

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
          <Activity size={14} className="text-slate-400" />
          Risk Score Distribution
        </h3>
        <span className="text-slate-400 text-xs">{(transactions ?? []).length} transactions</span>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.05)' }} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map(entry => <Cell key={entry.key} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-2 flex-wrap">
        {BUCKETS.map(b => (
          <div key={b.key} className="flex items-center gap-1 text-[10px]">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
            <span className="text-slate-500 dark:text-slate-400">{b.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
