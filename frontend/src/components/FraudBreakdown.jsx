import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ShieldAlert } from 'lucide-react'

const COLORS = {
  COMPLETED:  '#10b981',
  FLAGGED:    '#ef4444',
  PROCESSING: '#3b82f6',
  PENDING:    '#f59e0b',
  FAILED:     '#64748b',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="rounded-lg px-3 py-2 text-xs bg-white dark:bg-[#141e35] border border-slate-200 dark:border-white/10 shadow-lg">
      <span style={{ color: COLORS[name] }} className="font-semibold">{name}: {value}</span>
    </div>
  )
}

export default function FraudBreakdown({ transactions }) {
  const data = useMemo(() => {
    const counts = {}
    ;(transactions ?? []).forEach(t => {
      counts[t.status] = (counts[t.status] ?? 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
          <ShieldAlert size={14} className="text-slate-400" />
          Status Breakdown
        </h3>
        <span className="text-slate-400 text-xs">{total} total</span>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-[160px] text-slate-400 text-xs">No transactions yet</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {data.map(entry => (
                  <Cell key={entry.name} fill={COLORS[entry.name] ?? '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {data.map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[d.name] ?? '#94a3b8' }} />
                  <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(d.value / total * 100)}%`, backgroundColor: COLORS[d.name] ?? '#94a3b8' }} />
                  </div>
                  <span className="text-slate-500 dark:text-slate-400 w-6 text-right font-mono">{d.value}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
