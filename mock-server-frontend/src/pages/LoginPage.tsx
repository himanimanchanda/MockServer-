import React from 'react'
import { useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import type { ToastKind } from '../components/Toast'
import { login, register, setAuthToken, setUserInfo, getAuthToken } from '../api/client'
import { useTheme } from '../context/ThemeContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { mode, toggle } = useTheme()

  const [isLogin, setIsLogin] = React.useState(true)
  const [olmId, setOlmId] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<{ kind: ToastKind; message: string } | null>(null)

  React.useEffect(() => {
    // If user is already logged in, redirect them away from the login page
    if (getAuthToken()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setToast(null)

    if (!olmId.trim() || !password.trim() || (!isLogin && !email.trim())) {
      setToast({ kind: 'error', message: 'All fields are required' })
      return
    }

    setLoading(true)

    try {
      if (isLogin) {
        const res = await login({ olmId, password })
        setAuthToken(res.token)
        setUserInfo({ userId: res.userId, olmId: res.olmId, createdAt: res.createdAt })
        navigate('/dashboard', { replace: true })
      } else {
        const res = await register({ olmId, email, password })
        setToast({ kind: 'success', message: 'Account created! Please login.' })
        setPassword('')
        setIsLogin(true)
      }
    } catch (e: any) {
      setToast({
        kind: 'error',
        message: e?.response?.data?.message || e?.message || 'Error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-mesh overflow-hidden relative" style={{ background: 'var(--bg-primary)' }}>
      
      {/* THEME TOGGLE (TOP RIGHT) */}
      <button
        onClick={toggle}
        className="absolute top-6 right-6 p-2.5 rounded-xl glass-hover text-slate-400 hover:text-slate-200 transition-all duration-200 z-10"
        title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {mode === 'dark' ? (
          <svg className="w-5 h-5 t-secondary hover:t-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 t-secondary hover:t-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-md animate-scale-in">
        {/* GLASS CARD */}
        <div className="glass-strong rounded-2xl p-8 glow-accent-sm">

          {toast && (
            <Toast
              kind={toast.kind}
              message={toast.message}
              onClose={() => setToast(null)}
            />
          )}

          {/* HEADER */}
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-accent mb-4 shadow-lg shadow-accent/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold t-heading">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-sm t-secondary mt-2">
              {isLogin
                ? 'Sign in to your mock server console'
                : 'Sign up to start building mock APIs'}
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={submit} className="space-y-5">

            <div>
              <label className="text-xs font-semibold t-label uppercase tracking-wider">OLM ID</label>
              <input
                className="w-full mt-2 px-4 py-3 rounded-xl input-dark text-sm"
                placeholder="Enter your OLM ID"
                value={olmId}
                onChange={(e) => setOlmId(e.target.value)}
              />
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs font-semibold t-label uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  className="w-full mt-2 px-4 py-3 rounded-xl input-dark text-sm"
                  placeholder="Enter your corporate email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold t-label uppercase tracking-wider">Password</label>
              <input
                type="password"
                className="w-full mt-2 px-4 py-3 rounded-xl input-dark text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient py-3 rounded-xl text-sm font-semibold"
            >
              {loading
                ? 'Please wait...'
                : isLogin
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>

          {/* TOGGLE */}
          <div className="mt-6 text-center text-sm t-muted">
            {isLogin ? "New user?" : 'Already have an account?'}{' '}
            <button
              className="text-accent-light font-medium hover:text-accent transition-colors"
              onClick={() => {
                setIsLogin(!isLogin)
                setToast(null)
              }}
            >
              {isLogin ? 'Sign up' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}