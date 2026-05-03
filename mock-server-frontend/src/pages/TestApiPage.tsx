import { useLocation } from 'react-router-dom'
import TestApiPanel from '../components/TestApiPanel'

export default function TestApiPage() {
  const location = useLocation()
  const endpointFromNav = (location.state as { endpoint?: string } | null)?.endpoint

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold t-heading">Test API</h1>
        <p className="mt-1 text-sm t-secondary">
          Send HTTP requests through the same mock engine and headers as the console.
        </p>
      </div>
      <TestApiPanel defaultEndpoint={endpointFromNav} />
    </div>
  )
}
