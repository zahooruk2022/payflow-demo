import React from 'react'

export default function StatCard({ label, value, sub, icon: Icon, color = 'blue' }) {
  const colors = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-500/10',     border: 'border-blue-200 dark:border-blue-500/20',     icon: 'text-blue-600 dark:text-blue-400',     val: 'text-blue-700 dark:text-blue-300' },
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20', icon: 'text-emerald-600 dark:text-emerald-400', val: 'text-emerald-700 dark:text-emerald-300' },
    red:    { bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/20',       icon: 'text-red-600 dark:text-red-400',       val: 'text-red-700 dark:text-red-300' },
    yellow: { bg: 'bg-amber-50 dark:bg-amber-500/10',   border: 'border-amber-200 dark:border-amber-500/20',   icon: 'text-amber-600 dark:text-amber-400',   val: 'text-amber-700 dark:text-amber-300' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', icon: 'text-purple-600 dark:text-purple-400', val: 'text-purple-700 dark:text-purple-300' },
  }
  const c = colors[color] ?? colors.blue

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex items-start gap-4 transition-colors duration-200`}>
      <div className={`p-2.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none ${c.icon} flex-shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${c.val} truncate`}>{value ?? '—'}</p>
        {sub && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  )
}
