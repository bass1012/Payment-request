import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface UserListItem {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  isActive: boolean
  matricule?: string
  fonction?: string
  department?: { id: string; name: string; code: string }
  createdAt: string
}

interface PaginatedUsers {
  data: UserListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UseUsersParams {
  page?: number
  limit?: number
  search?: string
  role?: string
  isActive?: boolean
}

export function useUsers({ page = 1, limit = 50, search, role, isActive }: UseUsersParams = {}) {
  return useQuery<PaginatedUsers>({
    queryKey: ['users', { page, limit, search, role, isActive }],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search) params.set('search', search)
      if (role) params.set('role', role)
      if (isActive !== undefined) params.set('isActive', String(isActive))
      const { data } = await api.get(`/admin/users?${params.toString()}`)
      return data
    },
    placeholderData: (prev) => prev,
  })
}
