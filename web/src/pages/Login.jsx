import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../api'
import { useAuth } from '../AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import { formatError } from '../utils/formatError'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, refresh } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await auth.login(email, password)
      login(res.accessToken, {
        id: res.id,
        email: res.email,
        name: res.name,
        role: res.role,
        clubTenantId: res.clubTenantId ?? null,
      })
      await refresh()
      navigate(res.role === 'Admin' ? '/admin' : '/')
    } catch (err) {
      setError(formatError(err, 'Invalid email or password.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 rounded-xl btn-brand text-white font-bold text-lg items-center justify-center mb-3">
            CS
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Coach Subscription</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to manage your academy</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p className="text-center text-sm text-slate-500 pb-6">
            No account?{' '}
            <Link to="/register" className="text-brand font-medium hover:underline">
              Register your academy
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
