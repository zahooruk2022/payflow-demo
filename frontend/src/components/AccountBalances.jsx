import React, { useEffect, useState } from 'react'
import { fetchAccounts } from '../api/client'
import { Building2, RefreshCw } from 'lucide-react'

const fmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(n)

export default function AccountBalances() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading]   = useState(true)

  const load = () => {
    setLoading(true)
    fetchAccounts().then(setAccounts).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
          <Building2 size={15} className="text-slate-400" />
          Account Balances
        </h3>
        <button onClick={load} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 rounded">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="space-y-3">
        {accounts.map(acc => {
          const pct = Math.min((acc.balance / 6100000) * 100, 100)
          return (
            <div key={acc.id} className="flex items-center gap-3 py-1">
              <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold">{acc.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-slate-700 dark:text-slate-200 text-xs font-medium truncate">{acc.name}</span>
                  <span className="text-slate-600 dark:text-slate-300 text-xs font-mono ml-2 flex-shrink-0">{fmt(acc.balance)}</span>
                </div>
                <div className="h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
