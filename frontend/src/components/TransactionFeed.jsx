import React, { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ArrowRight, AlertTriangle } from 'lucide-react'

const STATUS = {
  COMPLETED:  { badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
  FLAGGED:    { badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20',                         dot: 'bg-red-500' },
  PROCESSING: { badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20',                   dot: 'bg-blue-500 animate-pulse' },
  PENDING:    { badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20',             dot: 'bg-amber-500' },
  FAILED:     { badge: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20',            dot: 'bg-slate-400' },
}

const fmtAmt = (n) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

const fmtTime = (ts) => {
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts)
    return format(d, 'HH:mm:ss')
  } catch { return '' }
}

const FILTERS = ['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'FLAGGED']

export default function TransactionFeed({ transactions }) {
  const [filter, setFilter] = useState('ALL')
  const visible = filter === 'ALL' ? transactions : transactions.filter(t => t.status === filter)

  return (
    <div className="max-w-4xl space-y-4">
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === f
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {f}
            <span className="ml-1.5 text-[10px] opacity-60">
              {f === 'ALL' ? transactions.length : transactions.filter(t => t.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] divide-y divide-slate-100 dark:divide-white/[0.04] overflow-hidden transition-colors duration-200">
        {visible.length === 0 && (
          <div className="py-16 text-center text-slate-400 text-sm">No transactions match this filter.</div>
        )}
        {visible.map((txn, i) => {
          const s = STATUS[txn.status] ?? STATUS.PENDING
          const isFlagged = txn.status === 'FLAGGED'
          // REST API returns nested entity; WebSocket sends flat DTO — handle both
          const senderName      = txn.senderName      ?? txn.senderAccount?.name
          const senderAccNum    = txn.senderAccountNumber ?? txn.senderAccount?.accountNumber
          const receiverName    = txn.receiverName    ?? txn.receiverAccount?.name
          const receiverAccNum  = txn.receiverAccountNumber ?? txn.receiverAccount?.accountNumber
          return (
            <div
              key={txn.id}
              className={`flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.02] ${i === 0 ? 'animate-slide-in' : ''} ${isFlagged ? 'bg-red-50/50 dark:bg-red-500/[0.03]' : ''}`}
            >
              {/* Risk bar */}
              <div className="w-1 h-10 rounded-full flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-white/5">
                <div
                  className={`w-full rounded-full transition-all duration-500 ${(txn.riskScore ?? 0) >= 60 ? 'bg-red-500' : (txn.riskScore ?? 0) >= 30 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ height: `${txn.riskScore ?? 0}%` }}
                />
              </div>

              {/* Sender → Receiver */}
              <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-medium truncate">{senderName}</p>
                  <p className="text-slate-400 text-xs truncate">{senderAccNum}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-slate-800 dark:text-slate-200 text-sm font-medium truncate">{receiverName}</p>
                  <p className="text-slate-400 text-xs truncate">{receiverAccNum}</p>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <p className={`font-mono font-bold text-sm ${isFlagged ? 'text-red-600 dark:text-red-300' : 'text-slate-900 dark:text-white'}`}>
                  {fmtAmt(txn.amount)}
                </p>
                <p className="text-slate-400 text-[10px]">{txn.currency}</p>
              </div>

              {/* Status badge */}
              <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                {txn.status}
              </span>

              {isFlagged && <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />}

              <span className="text-slate-400 text-[10px] font-mono flex-shrink-0 w-16 text-right">
                {fmtTime(txn.timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
