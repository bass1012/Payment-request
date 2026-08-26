import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface ReportingData {
  range: { from: string; to: string }
  summary: {
    total: number
    rejectionRate: number | null
    activeOverdue: number
    slaComplianceRate: number | null
    averageProcessingHours: number | null
  }
  byType: Array<{
    type: string
    total: number
    rejected: number
    averageProcessingHours: number | null
  }>
  byStatus: Array<{ status: string; total: number }>
  byStep: Array<{ stepLabel: string; averageHours: number | null; samples: number }>
}

interface UseReportingParams {
  from: string
  to: string
  enabled?: boolean
}

export function useReporting({ from, to, enabled = true }: UseReportingParams) {
  return useQuery<ReportingData>({
    queryKey: ['reporting', { from, to }],
    queryFn: async () => {
      const { data } = await api.get('/reporting', { params: { from, to } })
      return data
    },
    enabled,
    staleTime: 60_000,
  })
}
