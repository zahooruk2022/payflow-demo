import React from 'react'
import { ShieldAlert, AlertTriangle, Zap, DollarSign } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const ALERT_META = {
  HIGH_AMOUNT:        { icon: DollarSign,  color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/20',       label: 'High Amount' },
  RAPID_SUCCESSION:   { icon: Zap,         color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-200 dark:border-orange-500/20', label: 'Rapid Succession' },
  FRAUD_DETECTED:     { icon: ShieldAlert, color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/20',       label: 'Fraud Detected' },
  SUSPICIOUS_PATTERN: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20',   label: 'Suspicious Pattern' },
}

const DEFAULT_META = { icon: AlertTriangle, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-200 dark:border-yellow-500/20', label: 'Alert' }

const fmtAmt = (n) => n != null
  ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
  : '—'

const fmtTime = (ts) => {
  try {
    const d = typeof ts === 'string' ? parseISO(ts) : new Date(ts)
    return format(d, 'dd MMM HH:mm:ss')
  } catch { return '—' }
}

export default function FraudAlerts({ alerts }) {
  if (alerts.length === 0) {
    return (
      <div className="max-w-3xl flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
          <ShieldAlert size={22} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">No fraud alerts</p>
        <p className="text-slate-400 text-xs">Submit payments over £50,000 or in rapid succession to trigger detection.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert size={16} className="text-red-500" />
        <h2 className="text-slate-900 dark:text-white font-semibold text-sm">
          {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} Detected
        </h2>
      </div>

      {alerts.map((alert, i) => {
        const meta = ALERT_META[alert.alertType] ?? DEFAULT_META
        const Icon = meta.icon
        const riskPct = alert.riskScore ?? 0

        return (
          <div key={alert.id ?? i} className={`rounded-xl border ${meta.border} ${meta.bg} p-4 animate-slide-in transition-colors duration-200`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg bg-white dark:bg-white/5 flex-shrink-0 ${meta.color} shadow-sm dark:shadow-none`}>
                <Icon size={16} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider ${meta.color}`}>{meta.label}</span>
                  <span className="text-slate-400 text-[10px] font-mono">{fmtTime(alert.timestamp)}</span>
                </div>

                <p className="text-slate-700 dark:text-slate-200 text-sm mb-2">{alert.description}</p>

                <div className="flex items-center gap-4 text-xs flex-wrap">
                  <div>
                    <span className="text-slate-400">From: </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{alert.senderName ?? '—'}</span>
                  </div>
                  {alert.receiverName && (
                    <div>
                      <span className="text-slate-400">To: </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{alert.receiverName}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Amount: </span>
                    <span className="text-slate-900 dark:text-white font-mono font-semibold">{fmtAmt(alert.amount)}</span>
                  </div>
                </div>

                {/* Risk meter */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-slate-400 text-[10px] w-14">Risk score</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${riskPct >= 80 ? 'bg-red-500' : riskPct >= 60 ? 'bg-orange-500' : 'bg-amber-400'}`}
                      style={{ width: `${riskPct}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${riskPct >= 60 ? 'text-red-500 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>{riskPct}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
