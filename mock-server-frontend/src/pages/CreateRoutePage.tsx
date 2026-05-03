import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import type { CreateMockRequest, MockDto } from '../types'
import { createMock, updateMock } from '../api/client'
import ApiRouteForm from '../components/ApiRouteForm'
import Toast from '../components/Toast'
import type { ToastKind } from '../components/Toast'
import { useProjectContext } from '../context/ProjectContext'

export default function CreateRoutePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedProjectId, refreshProjects } = useProjectContext()

  const selectedMock = (location.state as MockDto | null) ?? null
  const isEdit = selectedMock != null

  const [toast, setToast] = React.useState<{ kind: ToastKind; message: string } | null>(null)

  async function handleSave(payload: CreateMockRequest): Promise<void> {
    if (isEdit) {
      await updateMock(selectedMock.id, payload)
      setToast({ kind: 'success', message: 'Route updated successfully.' })
    } else {
      await createMock(payload)
      setToast({ kind: 'success', message: 'Route created successfully.' })
    }
    await refreshProjects()
  }

  return (
    <div>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />
      )}
      <ApiRouteForm
        mode={isEdit ? 'edit' : 'create'}
        selectedMock={selectedMock}
        selectedProjectId={selectedProjectId}
        onSave={handleSave}
        onCancel={() => navigate('/routes')}
      />
    </div>
  )
}