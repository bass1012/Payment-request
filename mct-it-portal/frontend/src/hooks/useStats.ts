import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface Stats {
  total: number
  pending: number
  inProgress: number
  closed: number
  rejected: number
}

export function useStats() {
  return useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await api.get('/requests/stats')
      return data
    },
    staleTime: 30_000,
  })
}
