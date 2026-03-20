const API = '/api'

function getToken() {
  return localStorage.getItem('token')
}

/** Build query string from params, omitting undefined, null, and empty string so URL never has "=undefined" */
function toQueryString(params) {
  if (!params || typeof params !== 'object') return ''
  const p = {}
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') p[k] = String(v)
  }
  const q = new URLSearchParams(p).toString()
  return q ? `?${q}` : ''
}

export async function api(path, init) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  return JSON.parse(text)
}

export const auth = {
  login: (email, password) =>
    api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email, password, name, academyName) =>
    api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name, academyName }) }),
}

export const coachApi = {
  me: () => api('/coach/me'),
  updateMe: (body) => api('/coach/me', { method: 'PUT', body: JSON.stringify(body) }),
  regenerateScheduleShareToken: () => api('/coach/me/schedule-share-token', { method: 'POST' }),
  uploadLogo: (file) => {
    const form = new FormData()
    form.append('file', file)
    const token = getToken()
    return fetch(`${API}/coach/me/logo`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form }).then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json() })
  },
}

export const studentsApi = {
  list: (params) => api(`/students${toQueryString(params)}`),
  get: (id) => api(`/students/${id}`),
  create: (body) => api('/students', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/students/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => api(`/students/${id}`, { method: 'DELETE' }),
  batchClassUsage: (studentIds) =>
    api('/students/class-usage', { method: 'POST', body: JSON.stringify({ studentIds }) }),
}

export const packagesApi = {
  list: () => api('/packages'),
  get: (id) => api(`/packages/${id}`),
  create: (body) => api('/packages', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/packages/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => api(`/packages/${id}`, { method: 'DELETE' }),
}

export const subscriptionsApi = {
  list: (params) => api(`/subscriptions${toQueryString(params)}`),
  get: (id) => api(`/subscriptions/${id}`),
  create: (body) => api('/subscriptions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/subscriptions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  recordPayment: (id, body) => api(`/subscriptions/${id}/payments`, { method: 'POST', body: JSON.stringify(body) }),
  sendReminder: (id, channel) => api(`/subscriptions/${id}/send-reminder?${channel ? `channel=${channel}` : ''}`, { method: 'POST' }),
  confirmRenewal: (id) => api(`/subscriptions/${id}/confirm-renewal`, { method: 'POST' }),
  renewalTransactions: (id) => api(`/subscriptions/${id}/renewal-transactions`),
  getParentLink: (studentId, subscriptionId, expiryDays) =>
    api(`/subscriptions/parent-link?studentId=${studentId}${subscriptionId ? `&subscriptionId=${subscriptionId}` : ''}${expiryDays ? `&expiryDays=${expiryDays}` : ''}`),
  createParentLink: (subscriptionId, body) => api(`/subscriptions/${subscriptionId}/parent-link`, { method: 'POST', body: JSON.stringify(body) }),
}

export const sessionsApi = {
  list: (params) => api(`/sessions${toQueryString(params)}`),
  get: (id) => api(`/sessions/${id}`),
  create: (body) => api('/sessions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => api(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => api(`/sessions/${id}`, { method: 'DELETE' }),
  getAttendance: (id) => api(`/sessions/${id}/attendance`),
  setAttendance: (id, items) =>
    api(`/sessions/${id}/attendance`, { method: 'PUT', body: JSON.stringify({ items }) }),
}

/** Public schedule (coach share link). */
export const scheduleApi = {
  listSessions: (token, params) => api(`/schedule/${encodeURIComponent(token)}/sessions${toQueryString(params)}`),
  book: (token, sessionId, contact) => {
    const trimmed = (contact ?? '').trim()
    const isEmail = trimmed.includes('@')
    const phone = isEmail ? null : trimmed
    const email = isEmail ? trimmed : null
    return api(`/schedule/${encodeURIComponent(token)}/sessions/${sessionId}/book`, {
      method: 'POST',
      body: JSON.stringify({ phone, email }),
    })
  },
  trialRequest: (token, body) =>
    api(`/schedule/${encodeURIComponent(token)}/trial-request`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export const messageLogsApi = {
  list: (params) => api(`/messagelogs${toQueryString(params)}`),
}

export const reportsApi = { dashboard: () => api('/reports/dashboard') }

export const parentApi = {
  getByToken: (token) => api(`/parent/${encodeURIComponent(token)}`),
  requestRenewal: (token) => api(`/parent/${encodeURIComponent(token)}/request-renewal`, { method: 'POST' }),
  listSessions: (token, params) => api(`/parent/${encodeURIComponent(token)}/sessions${toQueryString(params)}`),
  bookSession: (token, sessionId, phone) =>
    api(`/parent/${encodeURIComponent(token)}/sessions/${sessionId}/book`, {
      method: 'POST',
      body: JSON.stringify({ phone: phone || null }),
    }),
}

export const adminApi = {
  dashboard: () => api('/admin/dashboard'),
  getCoachData: (coachId) => api(`/admin/coaches/${coachId}/data`),
  updateCoach: (id, body) => api(`/admin/coaches/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
}
