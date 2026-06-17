import React, { useMemo } from 'react'

const STATUS_COLOR = {
  COMPLETED:  'text-emerald-600 dark:text-emerald-400',
  FLAGGED:    'text-red-600 dark:text-red-400',
  PROCESSING: 'text-blue-600 dark:text-blue-400',
  PENDING:    'text-amber-600 dark:text-amber-400',
}

const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n)

export default function LiveTicker({ transactions }) {
  const items = useMemo(() =>
    (transactions ?? []).slice(0, 20).map(txn => {
      const sender   = txn.senderName   ?? txn.senderAccount?.name   ?? '—'
      const receiver = txn.receiverName ?? txn.receiverAccount?.name ?? '—'
      return { id: txn.id, sender, receiver, amount: txn.amount, status: txn.status }
    }), [transactions])

  if (items.length === 0) return null

  const doubled = [...items, ...items]

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] px-4 py-2.5 overflow-hidden transition-colors duration-200">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex-shrink-0 border-r border-slate-200 dark:border-white/10 pr-3">
          Live
        </span>
        <div className="overflow-hidden flex-1">
          <div
            className="flex gap-8 whitespace-nowrap"
            style={{ animation: 'ticker 40s linear infinite' }}
          >
            {doubled.map((item, i) => (
              <span key={`${item.id}-${i}`} className="inline-flex items-center gap-1.5 text-xs flex-shrink-0">
                <span className="text-slate-600 dark:text-slate-300 font-medium">{item.sender}</span>
                <span className="text-slate-300 dark:text-slate-600">→</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{item.receiver}</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{fmt(item.amount)}</span>
                <span className={`font-bold text-[10px] ${STATUS_COLOR[item.status] ?? 'text-slate-400'}`}>
                  {item.status}
                </span>
                <span className="text-slate-200 dark:text-slate-700 mx-1">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
