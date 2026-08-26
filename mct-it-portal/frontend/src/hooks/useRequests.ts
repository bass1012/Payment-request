import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { Request, PaginatedResponse } from '../types'

interface UseRequestsParams {
  page?: number
  limit?: number
  status?: string
  type?: string
  scope?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useRequests({
  page = 1,
  limit = 20,
  status,
  type,
  scope,
  search,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}: UseRequestsParams = {}) {
  return useQuery<PaginatedResponse<Request>>({
    queryKey: ['requests', { page, limit, status, type, scope, search, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      params.set('sortBy', sortBy)
      params.set('sortOrder', sortOrder)
      if (status) params.set('status', status)
      if (type) params.set('type', type)
      if (scope) params.set('scope', scope)
      if (search) params.set('search', search)
      const { data } = await api.get(`/requests?${params.toString()}`)
      // Transform API response to match PaginatedResponse interface
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
