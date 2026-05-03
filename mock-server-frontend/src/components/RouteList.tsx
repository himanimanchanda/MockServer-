import React from 'react'
import RoutesTable from './RoutesTable'
import type { MockDto } from '../types'

export default function RouteList(props: {
  mocks: MockDto[]
  searchQuery: string
  loading?: boolean
  onEdit: (mock: MockDto) => void
  onDelete: (id: string) => void
  onClone: (mock: MockDto) => void
  onViewCurl: (mock: MockDto) => void
  onCreateFirstRoute?: () => void
  onViewQueryParams?: (mock: MockDto) => void
  onViewHeaders?: (mock: MockDto) => void
  onViewBody?: (mock: MockDto) => void
  onViewResponse?: (mock: MockDto) => void
  onTestApi?: (mock: MockDto) => void
  isTrash?: boolean
  onRecover?: (id: string) => void
}) {
  return <RoutesTable {...props} />
}
