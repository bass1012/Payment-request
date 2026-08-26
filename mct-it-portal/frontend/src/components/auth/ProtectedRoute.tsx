import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import type { Role } from '../../constants/roles'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** Rôles autorisés. Si vide, tout utilisateur authentifié est autorisé. */
  allowedRoles?: Role[]
  /** URL de redirection si non autorisé (défaut: '/') */
  redirectTo?: string
}

/**
 * Composant garde de route basé sur le rôle.
 *
 * - Non authentifié → /login
 * - Rôle non autorisé → redirectTo (défaut: /)
 * - Autorisé → children
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles.length > 0 && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
