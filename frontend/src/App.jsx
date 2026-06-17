import React, { useState, useCallback, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { fetchTransactions, fetchStats, fetchAlerts } from './api/client'
import Dashboard from './components/Dashboard'
import TransactionFeed from './components/TransactionFeed'
import PaymentForm from './components/PaymentForm'
import FraudAlerts from './components/FraudAlerts'
import { Activity, Send, ShieldAlert, LayoutDashboard, Wifi, WifiOff, Sun, Moon } from 'lucide-react'

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'payments',     label: 'Send Payment', icon: Send },
  { id: 'transactions', label: 'Live Feed',    icon: Activity },
  { id: 'alerts',       label: 'Fraud Alerts', icon: ShieldAlert },
]

function normaliseAlert(a) {
  return {
    id: a.id,
    senderName: a.transaction?.senderAccount?.name ?? a.senderName ?? '—',
    receiverName: a.transaction?.receiverAccount?.name ?? a.receiverName ?? '—',
    amount: a.transaction?.amount ?? a.amount,
    riskScore: a.riskScore,
    alertType: a.alertType,
    description: a.description,
    timestamp: a.createdAt ?? a.timestamp,
  }
}

export default function App() {
  const [tab, setTab]                = useState('dashboard')
  const [transactions, setTxns]      = useState([])
  const [stats, setStats]            = useState(null)
  const [alerts, setAlerts]          = useState([])
  const [connected, setConnected]    = useState(false)
  const [newAlertCount, setNewAlert] = useState(0)

  // Theme — default dark, persisted to localStorage
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('payflow-theme')
    return stored ? stored === 'dark' : true
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('payflow-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    fetchTransactions(50).then(setTxns)
    fetchStats().then(setStats)
    fetchAlerts(20).then(data => setAlerts(data.map(normaliseAlert)))
  }, [])

  const handleTransaction = useCallback((event) => {
    setTxns(prev => {
      const idx = prev.findIndex(t => t.id === event.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = event
        return updated
      }
      return [event, ...prev].slice(0, 150)
    })
  }, [])

  const handleFraudAlert = useCallback((event) => {
    const alert = {
      id: event.id ?? `ws-${Date.now()}`,
      senderName: event.senderName,
      receiverName: event.receiverName,
      amount: event.amount,
      riskScore: event.riskScore,
      alertType: 'FRAUD_DETECTED',
      description: event.fraudReason,
      timestamp: event.timestamp,
    }
    setAlerts(prev => [alert, ...prev].slice(0, 50))
    setNewAlert(n => n + 1)
  }, [])

  const handleStats    = useCallback(setStats, [])

  useWebSocket({
    onTransaction: handleTransaction,
    onFraudAlert:  handleFraudAlert,
    onStats:       handleStats,
    onConnected:   setConnected,
  })

  const switchTab = (id) => {
    setTab(id)
    if (id === 'alerts') setNewAlert(0)
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f1729] flex flex-col transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0b1220] px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <span className="text-slate-900 dark:text-white font-bold text-base tracking-tight">PayFlow</span>
            <span className="ml-2 text-slate-400 text-xs font-medium hidden sm:inline">Real-Time Payment Processing</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border ${
            connected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
          }`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="font-medium">{connected ? 'Live' : 'Connecting…'}</span>
            {connected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />}
          </div>

          {/* Dark / Light toggle */}
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#0b1220] px-6">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                tab === id
                  ? 'border-blue-500 text-blue-600 dark:text-white'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={14} />
              {label}
              {id === 'alerts' && newAlertCount > 0 && (
                <span className="animate-slide-in absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {newAlertCount > 9 ? '9+' : newAlertCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 p-6 overflow-auto">
        {tab === 'dashboard'    && <Dashboard stats={stats} transactions={transactions} alerts={alerts} />}
        {tab === 'payments'     && <PaymentForm onSubmitted={handleTransaction} />}
        {tab === 'transactions' && <TransactionFeed transactions={transactions} />}
        {tab === 'alerts'       && <FraudAlerts alerts={alerts} />}
      </main>
    </div>
  )
}
