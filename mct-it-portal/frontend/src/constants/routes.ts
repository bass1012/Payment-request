import { ROLES, type Role } from './roles'

/**
 * Mapping route → rôles autorisés.
 * Utilisé à la fois par ProtectedRoute (App.tsx) et Layout.tsx (navigation).
 */
export const ROUTES_BY_ROLE: Record<string, Role[]> = {
  '/admin': [ROLES.IT, ROLES.IT_ADMIN, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  '/reporting': [ROLES.IT, ROLES.IT_ADMIN, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  '/treasury': [ROLES.TREASURY, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
  '/moyens-generaux': [ROLES.MOYENS_GENERAUX, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.IT_ADMIN],
}

/**
 * Vérifie si un rôle est autorisé pour une route donnée.
 */
export function canAccessRoute(role: Role | undefined, path: string): boolean {
  if (!role) return false
  const allowed = ROUTES_BY_ROLE[path]
  if (!allowed) return true // Routes sans restriction
  return allowed.includes(role)
}
