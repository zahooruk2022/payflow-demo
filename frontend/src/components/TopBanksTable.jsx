import React, { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', notation: 'compact', maximumFractionDigits: 1 }).format(n)

export default function TopBanksTable({ transactions }) {
  const banks = useMemo(() => {
    const map = {}
    ;(transactions ?? []).forEach(txn => {
      const name = txn.senderName ?? txn.senderAccount?.name
      if (!name) return
      if (!map[name]) map[name] = { name, sent: 0, sentAmt: 0, received: 0, flags: 0 }
      map[name].sent++
      map[name].sentAmt += Number(txn.amount ?? 0)
      if (txn.status === 'FLAGGED') map[name].flags++
    })
    ;(transactions ?? []).forEach(txn => {
      const name = txn.receiverName ?? txn.receiverAccount?.name
      if (!name) return
      if (!map[name]) map[name] = { name, sent: 0, sentAmt: 0, received: 0, flags: 0 }
      map[name].received++
    })
    return Object.values(map).sort((a, b) => b.sentAmt - a.sentAmt).slice(0, 6)
  }, [transactions])

  const maxAmt = Math.max(...banks.map(b => b.sentAmt), 1)

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          Top Banks by Volume
        </h3>
        <span className="text-slate-400 text-xs">By sent amount</span>
      </div>

      {banks.length === 0 ? (
        <p className="text-slate-400 text-xs text-center py-8">No transaction data yet</p>
      ) : (
        <div className="space-y-3">
          {banks.map((bank, i) => (
            <div key={bank.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-400 font-mono w-4 text-right flex-shrink-0">{i + 1}</span>
                  <span className="text-slate-700 dark:text-slate-200 font-medium truncate">{bank.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px]">{bank.sent} sent · {bank.received} recv</span>
                  {bank.flags > 0 && (
                    <span className="bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-500/20">
                      ⚠ {bank.flags}
                    </span>
                  )}
                  <span className="text-slate-700 dark:text-slate-300 font-mono font-semibold">{fmt(bank.sentAmt)}</span>
                </div>
              </div>
              <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden ml-6">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                  style={{ width: `${(bank.sentAmt / maxAmt) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
