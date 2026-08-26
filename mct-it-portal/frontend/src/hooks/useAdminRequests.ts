import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { Request } from '../types'

interface PaginatedAdminRequests {
  data: Request[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseAdminRequestsParams {
  page?: number
  limit?: number
  status?: string
  type?: string
}

export function useAdminRequests({ page = 1, limit = 20, status, type }: UseAdminRequestsParams = {}) {
  return useQuery<PaginatedAdminRequests>({
    queryKey: ['admin-requests', { page, limit, status, type }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (status) params.set('status', status)
      if (type) params.set('type', type)
      const { data } = await api.get(`/admin/requests?${params.toString()}`)
      // Transform API response to match PaginatedAdminRequests interface
      return {
        data: data.requests || data.data || [],
        total: data.pagination?.total ?? data.total ?? 0,
        page: data.pagination?.page ?? data.page ?? page,
        limit: data.pagination?.limit ?? data.limit ?? limit,
        totalPages: data.pagination?.pages ?? data.totalPages ?? 0,
      }
    },
    placeholderData: (prev) => prev,
  })
}
