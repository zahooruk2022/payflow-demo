import React, { useEffect, useState } from 'react'
import { fetchAccounts, submitPayment } from '../api/client'
import { Send, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const QUICK_AMOUNTS = [10000, 25000, 50000, 75000]
const fmtAmt = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(n)

export default function PaymentForm({ onSubmitted }) {
  const [accounts, setAccounts] = useState([])
  const [form, setForm]         = useState({ senderAccountId: '', receiverAccountId: '', amount: '', currency: 'GBP', description: '' })
  const [state, setState]       = useState('idle') // idle | loading | success | error
  const [message, setMessage]   = useState('')

  useEffect(() => {
    fetchAccounts().then(data => {
      setAccounts(data)
      if (data.length >= 2) {
        setForm(f => ({ ...f, senderAccountId: data[0].id, receiverAccountId: data[1].id }))
      }
    })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.senderAccountId === form.receiverAccountId) {
      setMessage('Sender and receiver must be different accounts.')
      setState('error')
      return
    }
    setState('loading')
    try {
      const txn = await submitPayment({ ...form, amount: parseFloat(form.amount) })
      onSubmitted?.(txn)
      setState('success')
      setMessage(`Payment ${txn.reference} submitted — processing now.`)
      setForm(f => ({ ...f, amount: '', description: '' }))
    } catch (err) {
      setState('error')
      setMessage(err.response?.data?.message ?? 'Failed to submit payment. Is the backend running?')
    }
  }

  const inputCls = 'w-full bg-slate-50 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2.5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400'
  const selectCls = `${inputCls} cursor-pointer`

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#141e35] p-6 transition-colors duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center">
            <Send size={16} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white font-semibold">New Interbank Payment</h2>
            <p className="text-slate-400 text-xs">Submit a payment — watch it process in real time</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sender */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Sending Bank</label>
            <select value={form.senderAccountId} onChange={e => set('senderAccountId', e.target.value)} className={selectCls} required>
              <option value="">— Select sending bank —</option>
              {accounts.map(a => (
                <option key={a.id} value={a.id} className="bg-white dark:bg-[#141e35]">
                  {a.name} — {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(a.balance)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center">
            <ArrowRight size={18} className="text-slate-300 dark:text-slate-600" />
          </div>

          {/* Receiver */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Receiving Bank</label>
            <select value={form.receiverAccountId} onChange={e => set('receiverAccountId', e.target.value)} className={selectCls} required>
              <option value="">— Select receiving bank —</option>
              {accounts.filter(a => a.id !== form.senderAccountId).map(a => (
                <option key={a.id} value={a.id} className="bg-white dark:bg-[#141e35]">{a.name}</option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Amount (GBP)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">£</span>
              <input
                type="number" min="0.01" step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className={`${inputCls} pl-7`}
                required
              />
            </div>
            {/* Quick amounts */}
            <div className="flex gap-2 mt-2 flex-wrap">
              {QUICK_AMOUNTS.map(amt => (
                <button
                  key={amt} type="button"
                  onClick={() => set('amount', amt.toString())}
                  className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                    parseFloat(form.amount) === amt
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {fmtAmt(amt)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => set('amount', '60000')}
                className="px-2.5 py-1 rounded-md text-xs border bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                title="Guarantees a fraud flag"
              >
                £60K ⚠ fraud test
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5 uppercase tracking-wider">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="e.g. Interbank settlement — Q2 FY26"
              className={inputCls}
            />
          </div>

          {/* Feedback */}
          {state === 'success' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs animate-slide-in">
              <CheckCircle size={13} className="mt-0.5 flex-shrink-0" />
              {message}
            </div>
          )}
          {state === 'error' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300 text-xs animate-slide-in">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all text-sm"
          >
            {state === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {state === 'loading' ? 'Submitting…' : 'Send Payment'}
          </button>
        </form>

        <p className="text-slate-400 text-xs text-center mt-4">
          Tip: Try &gt;£50K, round numbers, or rapid succession to trigger fraud detection
        </p>
      </div>
    </div>
  )
}
