const API = '/api'

/** Super Admin: club owner coach id — sent to API so tenant-scoped routes work (see backend TenantMiddleware). */
export const ACTING_TENANT_HEADER = 'X-Acting-Tenant-Id'

function getToken() {
  return localStorage.getItem('token')
}

function actingTenantHeaders() {
  const id = localStorage.getItem('actingTenantId')
  if (!id) return {}
  return { [ACTING_TENANT_HEADER]: id }
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
      ...actingTenantHeaders(),
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
  team: () => api('/coach/team'),
  createStaffCoach: (body) => api('/coach/team', { method: 'POST', body: JSON.stringify(body) }),
  updateStaffCoach: (id, body) => api(`/coach/team/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteStaffCoach: (id) => api(`/coach/team/${id}`, { method: 'DELETE' }),
  regenerateScheduleShareToken: () => api('/coach/me/schedule-share-token', { method: 'POST' }),
  uploadLogo: (file) => {
    const form = new FormData()
    form.append('file', file)
    const token = getToken()
    return fetch(`${API}/coach/me/logo`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...actingTenantHeaders() },
      body: form,
    }).then(r => { if (!r.ok) throw new Error('Upload failed'); return r.json() })
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
  setMeasurementUnit: (id, measurementUnit) =>
    api(`/students/${id}/measurement-unit`, {
      method: 'PUT',
      body: JSON.stringify({ measurementUnit }),
    }),
}

export const progressApi = {
  getSummary: (studentId, months = 12) =>
    api(`/students/${studentId}/progress?months=${months}`),
  getChart: (studentId, months = 12) =>
    api(`/students/${studentId}/progress/chart?months=${months}`),
  create: (studentId, body) =>
    api(`/students/${studentId}/progress`, { method: 'POST', body: JSON.stringify(body) }),
  update: (studentId, checkInId, body) =>
    api(`/students/${studentId}/progress/${checkInId}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (studentId, checkInId) =>
    api(`/students/${studentId}/progress/${checkInId}`, { method: 'DELETE' }),
  setMeasurementUnit: (studentId, measurementUnit) =>
    studentsApi.setMeasurementUnit(studentId, measurementUnit),
  updateProfile: (studentId, body) =>
    api(`/students/${studentId}/progress/profile`, { method: 'PUT', body: JSON.stringify(body) }),
  previewBodyFat: (studentId, body) =>
    api(`/students/${studentId}/progress/preview-body-fat`, { method: 'POST', body: JSON.stringify(body) }),
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

export const reportsApi = {
  dashboard: () => api('/reports/dashboard'),
  monthly: (months = 12) => api(`/reports/monthly?months=${months}`),
}

export const parentApi = {
  getByToken: (token) => api(`/parent/${encodeURIComponent(token)}`),
  requestRenewal: (token) => api(`/parent/${encodeURIComponent(token)}/request-renewal`, { method: 'POST' }),
  listSessions: (token, params) => api(`/parent/${encodeURIComponent(token)}/sessions${toQueryString(params)}`),
  listAttendedClasses: (token) => api(`/parent/${encodeURIComponent(token)}/attended-classes`),
  bookSession: (token, sessionId, phone) =>
    api(`/parent/${encodeURIComponent(token)}/sessions/${sessionId}/book`, {
      method: 'POST',
      body: JSON.stringify({ phone: phone || null }),
    }),
  getProgress: (token, months = 12) =>
    api(`/parent/${encodeURIComponent(token)}/progress?months=${months}`),
  createProgress: (token, body) =>
    api(`/parent/${encodeURIComponent(token)}/progress`, { method: 'POST', body: JSON.stringify(body) }),
  setMeasurementUnit: (token, measurementUnit) =>
    api(`/parent/${encodeURIComponent(token)}/measurement-unit`, {
      method: 'PUT',
      body: JSON.stringify({ measurementUnit }),
    }),
  updateProfile: (token, body) =>
    api(`/parent/${encodeURIComponent(token)}/progress-profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  previewBodyFat: (token, body) =>
    api(`/parent/${encodeURIComponent(token)}/progress/preview-body-fat`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

export const adminApi = {
  dashboard: () => api('/admin/dashboard'),
  /** Academy tenants (owners); staff belong to an academy, not listed as separate tenants. */
  listAcademySummaries: () => api('/admin/academies'),
  listAcademies: () => api('/admin/academies'),
  getCoachData: (coachId) => api(`/admin/coaches/${coachId}/data`),
  onboardAcademy: (body) => api('/admin/academies', { method: 'POST', body: JSON.stringify(body) }),
  updateAcademy: (id, body) => api(`/admin/coaches/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deactivateAcademy: (id) => api(`/admin/coaches/${id}`, { method: 'DELETE' }),
}
