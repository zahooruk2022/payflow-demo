import React, { useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { format, parseISO, startOfMinute, subMinutes } from 'date-fns'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-white dark:bg-[#141e35] border border-slate-200 dark:border-white/10 shadow-lg">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function LiveChart({ transactions }) {
  const data = useMemo(() => {
    const now = new Date()
    const buckets = {}
    for (let i = 14; i >= 0; i--) {
      const t = subMinutes(now, i)
      const key = format(startOfMinute(t), 'HH:mm')
      buckets[key] = { time: key, completed: 0, flagged: 0 }
    }
    transactions.forEach(txn => {
      const ts = txn.timestamp ?? txn.createdAt
      if (!ts) return
      const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts)
      const key = format(startOfMinute(d), 'HH:mm')
      if (buckets[key]) {
        const status = (txn.status ?? '').toUpperCase()
        if (status === 'COMPLETED') buckets[key].completed++
        else if (status === 'FLAGGED') buckets[key].flagged++
      }
    })
    return Object.values(buckets)
  }, [transactions])

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Transaction Volume — Last 15 min</h3>
        <span className="text-slate-400 text-xs">Live · 1-min buckets</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradFlagged" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
          <Area type="monotone" dataKey="completed" name="Completed" stroke="#10b981" strokeWidth={2} fill="url(#gradCompleted)" />
          <Area type="monotone" dataKey="flagged"   name="Flagged"   stroke="#ef4444" strokeWidth={2} fill="url(#gradFlagged)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
