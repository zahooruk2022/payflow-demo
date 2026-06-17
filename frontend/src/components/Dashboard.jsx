import React from 'react'
import StatCard from './StatCard'
import LiveChart from './LiveChart'
import AccountBalances from './AccountBalances'
import FraudBreakdown from './FraudBreakdown'
import TopBanksTable from './TopBanksTable'
import RiskScoreChart from './RiskScoreChart'
import SystemStatus from './SystemStatus'
import LiveTicker from './LiveTicker'
import { Activity, ShieldAlert, DollarSign, TrendingUp, Clock, ArrowUpDown, Percent } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const STATUS_STYLE = {
  COMPLETED:  { dot: 'bg-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20' },
  FLAGGED:    { dot: 'bg-red-500',     badge: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/20' },
  PROCESSING: { dot: 'bg-blue-500 animate-pulse', badge: 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20' },
  PENDING:    { dot: 'bg-amber-500',   badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20' },
  FAILED:     { dot: 'bg-slate-400',   badge: 'bg-slate-100 dark:bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-500/20' },
}

const fmtAmt = (n) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtVol = (n) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`
  return `£${n}`
}

const fmtTime = (ts) => {
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts)
    return format(d, 'HH:mm:ss')
  } catch { return '—' }
}

const avgAmount = (transactions) => {
  const completed = (transactions ?? []).filter(t => t.status === 'COMPLETED')
  if (!completed.length) return 0
  return completed.reduce((s, t) => s + Number(t.amount ?? 0), 0) / completed.length
}

export default function Dashboard({ stats, transactions, alerts }) {
  const recent = (transactions ?? []).slice(0, 8)
  const avg    = avgAmount(transactions)

  return (
    <div className="space-y-4 max-w-[1600px]">

      {/* Live ticker */}
      <LiveTicker transactions={transactions} />

      {/* Stat cards — 3 columns × 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Total Transactions" value={stats?.totalTransactions ?? 0}  icon={Activity}    color="blue"   sub={`${stats?.pendingTransactions ?? 0} in-flight`} />
        <StatCard label="Settled Volume"     value={fmtVol(stats?.totalVolume ?? 0)} icon={DollarSign}  color="green"  sub="Completed payments" />
        <StatCard label="Fraud Flags"        value={stats?.flaggedTransactions ?? 0} icon={ShieldAlert} color="red"    sub={`${stats?.fraudRate ?? 0}% fraud rate`} />
        <StatCard label="Success Rate"       value={`${stats?.successRate ?? 0}%`}   icon={TrendingUp}  color="purple" sub={`${stats?.completedTransactions ?? 0} completed`} />
        <StatCard label="Avg Transaction"    value={fmtVol(avg)}                      icon={ArrowUpDown} color="yellow" sub="Completed payments" />
        <StatCard label="In-Flight"          value={stats?.pendingTransactions ?? 0} icon={Percent}     color="blue"   sub="Pending + processing" />
      </div>

      {/* Row 2: Volume chart + Fraud breakdown + System status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7"><LiveChart transactions={transactions ?? []} /></div>
        <div className="lg:col-span-3"><FraudBreakdown transactions={transactions} /></div>
        <div className="lg:col-span-2"><SystemStatus /></div>
      </div>

      {/* Row 3: Top banks + Risk distribution + Account balances */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5"><TopBanksTable transactions={transactions} /></div>
        <div className="lg:col-span-4"><RiskScoreChart transactions={transactions} /></div>
        <div className="lg:col-span-3"><AccountBalances /></div>
      </div>

      {/* Row 4: Recent transactions — full width */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            Recent Transactions
          </h3>
          <span className="text-slate-400 text-xs">Last 8</span>
        </div>

        {recent.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No transactions yet — send a payment to see it here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.04]">
                  {['Reference', 'Sender', 'Receiver', 'Amount', 'Currency', 'Status', 'Risk Score', 'Time'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium pb-3 pr-4 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.03]">
                {recent.map(txn => {
                  const s            = STATUS_STYLE[txn.status] ?? STATUS_STYLE.PENDING
                  const senderName   = txn.senderName   ?? txn.senderAccount?.name
                  const receiverName = txn.receiverName ?? txn.receiverAccount?.name
                  return (
                    <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors animate-slide-in">
                      <td className="py-3 pr-4 font-mono text-slate-400">{txn.reference?.slice(-12) ?? '—'}</td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-200 max-w-[130px] truncate font-medium">{senderName}</td>
                      <td className="py-3 pr-4 text-slate-700 dark:text-slate-200 max-w-[130px] truncate">{receiverName}</td>
                      <td className="py-3 pr-4 font-mono font-bold text-slate-900 dark:text-white">{fmtAmt(txn.amount)}</td>
                      <td className="py-3 pr-4 text-slate-400">{txn.currency ?? 'GBP'}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${s.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-14 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${(txn.riskScore ?? 0) >= 60 ? 'bg-red-500' : (txn.riskScore ?? 0) >= 30 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                              style={{ width: `${txn.riskScore ?? 0}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${(txn.riskScore ?? 0) >= 60 ? 'text-red-500' : (txn.riskScore ?? 0) >= 30 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {txn.riskScore ?? 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">{fmtTime(txn.timestamp ?? txn.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
