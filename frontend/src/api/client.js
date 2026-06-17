import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const fetchAccounts    = ()              => api.get('/accounts').then(r => r.data)
export const fetchTransactions = (limit = 50)  => api.get(`/payments?limit=${limit}`).then(r => r.data)
export const fetchStats        = ()             => api.get('/dashboard/stats').then(r => r.data)
export const fetchAlerts       = (limit = 20)  => api.get(`/dashboard/alerts?limit=${limit}`).then(r => r.data)
export const submitPayment     = (payload)      => api.post('/payments', payload).then(r => r.data)
