import React, { useEffect, useState } from 'react'
import { Database, MessageSquare, Zap, Server, RefreshCw } from 'lucide-react'

const SERVICES = [
  { key: 'db',     label: 'PostgreSQL',  icon: Database },
  { key: 'rabbit', label: 'RabbitMQ',   icon: MessageSquare },
  { key: 'redis',  label: 'Redis',       icon: Zap },
  { key: 'ping',   label: 'API',         icon: Server },
]

export default function SystemStatus() {
  const [health, setHealth]   = useState({})
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState(null)

  const check = () => {
    setLoading(true)
    fetch('/actuator/health')
      .then(r => r.json())
      .then(data => {
        const components = data.components ?? {}
        setHealth({
          db:     components.db?.status     ?? (data.status === 'UP' ? 'UP' : 'UNKNOWN'),
          rabbit: components.rabbit?.status ?? 'UNKNOWN',
          redis:  components.redis?.status  ?? 'UNKNOWN',
          ping:   data.status               ?? 'UNKNOWN',
        })
        setLastChecked(new Date())
      })
      .catch(() => setHealth({ db: 'DOWN', rabbit: 'DOWN', redis: 'DOWN', ping: 'DOWN' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    check()
    const id = setInterval(check, 15000)
    return () => clearInterval(id)
  }, [])

  const dot = (status) => {
    if (status === 'UP')      return 'bg-emerald-500'
    if (status === 'DOWN')    return 'bg-red-500'
    return 'bg-amber-400 animate-pulse'
  }

  const label = (status) => {
    if (status === 'UP')      return 'text-emerald-600 dark:text-emerald-400'
    if (status === 'DOWN')    return 'text-red-600 dark:text-red-400'
    return 'text-amber-600 dark:text-amber-400'
  }

  const fmt = (d) => d ? d.toLocaleTimeString('en-GB') : '—'

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-5 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-semibold text-sm flex items-center gap-2">
          <Server size={14} className="text-slate-400" />
          System Health
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[10px]">Checked {fmt(lastChecked)}</span>
          <button onClick={check} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors p-1 rounded">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {SERVICES.map(({ key, label: name, icon: Icon }) => {
          const status = health[key] ?? 'UNKNOWN'
          return (
            <div key={key} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Icon size={13} className="text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300 text-xs font-medium">{name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold uppercase ${label(status)}`}>{status}</span>
                <span className={`w-2 h-2 rounded-full ${dot(status)}`} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
        <a
          href="http://localhost:15672"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:text-blue-400 text-[10px] font-medium flex items-center gap-1"
        >
          <MessageSquare size={10} /> RabbitMQ Console →
        </a>
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 hover:text-blue-400 text-[10px] font-medium flex items-center gap-1 mt-1"
        >
          <Zap size={10} /> Grafana Dashboard →
        </a>
      </div>
    </div>
  )
}
