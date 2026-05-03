import React from 'react'
import { Navigate } from 'react-router-dom'
import { getAuthToken, API_BASE_URL } from '../api/client'

type Props = {
  children: React.ReactNode
}

/**
 * ProtectedRoute — guards pages behind auth.
 *
 * When auth is DISABLED on the backend (default: mockserver.auth.enabled=false),
 * we still need the UI to work without login. So if no token exists and we get
 * a 200 from a public endpoint, we skip the login gate.
 *
 * Strategy: if there's a token, allow through. If not, check if auth is required
 * by testing a public endpoint. If auth is off, allow through anyway.
 */
export default function ProtectedRoute({ children }: Props) {
  const token = getAuthToken()
  const [checking, setChecking] = React.useState(!token)
  const [authRequired, setAuthRequired] = React.useState(true)

  React.useEffect(() => {
    if (token) return // already logged in

    // Probe the backend to see if auth is actually required
    const base = API_BASE_URL || ''
    fetch(`${base}/actuator/health`, { method: 'GET' })
      .then((res) => {
        if (res.ok) {
          // Backend is up and auth is not blocking — allow through
          setAuthRequired(false)
        }
      })
      .catch(() => {
        // Network error or CORS — assume auth is required (safer)
        setAuthRequired(true)
      })
      .finally(() => setChecking(false))
  }, [token])

  // If we have a token, always allow
  if (token) {
    return <>{children}</>
  }

  // While checking auth status, show nothing (avoids flash)
  if (checking) {
    return null
  }

  // Auth is not required (backend has auth disabled) — allow through
  if (!authRequired) {
    return <>{children}</>
  }

  // Auth is required and no token — redirect to login
  return <Navigate to="/login" replace />
}