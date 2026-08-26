import axios from 'axios'
import { getAccessToken } from '../contexts/AuthContext'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Flag pour éviter les refresh simultanés
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error || !token) reject(error)
    else resolve(token)
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    // Ne pas tenter de refresh pour /auth/login, /auth/refresh, /auth/register
    const skipRefresh = ['/auth/login', '/auth/refresh', '/auth/register', '/auth/verify']
    if (skipRefresh.some(p => originalRequest.url?.includes(p))) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // File d'attente : les requêtes en attente recevront le nouveau token
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // Le refresh token est un httpOnly cookie envoyé automatiquement
        const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const newToken = data.token
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        // Déclenche la mise à jour du contexte via le custom event
        window.dispatchEvent(new CustomEvent('token-refreshed', { detail: { token: newToken } }))
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        // Refresh échoué → nettoyer et rediriger
        localStorage.removeItem('user')
        const publicPaths = ['/login', '/register']
        if (!publicPaths.some(p => window.location.pathname.startsWith(p))) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
