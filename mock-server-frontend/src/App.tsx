import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ShellLayout from './components/ShellLayout'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import ProjectsPage from './pages/ProjectsPage'
import RoutesPage from './pages/RoutesPage'
import CreateRoutePage from './pages/CreateRoutePage'
import TestApiPage from './pages/TestApiPage'
import AuditTrailPage from './pages/AuditTrailPage'
import { ProjectProvider } from './context/ProjectContext'

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <div className="flex min-h-screen items-center justify-center bg-mesh p-6" style={{ background: 'var(--bg-primary)' }}>
            <LoginPage />
          </div>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ProjectProvider>
              <ShellLayout />
            </ProjectProvider>
          </ProtectedRoute>
        }
      >
        <Route index                 element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"      element={<DashboardPage />} />
        <Route path="projects"       element={<ProjectsPage />} />
        <Route path="routes"         element={<RoutesPage />} />
        <Route path="create-route"   element={<CreateRoutePage />} />
        <Route path="test-api"       element={<TestApiPage />} />
        <Route path="audit"          element={<AuditTrailPage />} />
      </Route>
      <Route path="/mocks" element={<Navigate to="/routes" replace />} />
      <Route path="*"      element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}