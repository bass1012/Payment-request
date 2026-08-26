export const ROLES = {
  EMPLOYEE: 'EMPLOYEE',
  CHEF_DEPT: 'CHEF_DEPT',
  DIRECTOR: 'DIRECTOR',
  DG: 'DG',
  RH: 'RH',
  TREASURY: 'TREASURY',
  IT: 'IT',
  MOYENS_GENERAUX: 'MOYENS_GENERAUX',
  DAF: 'DAF',
  DGOF: 'DGOF',
  IT_ADMIN: 'IT_ADMIN',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const VALID_ROLES: readonly Role[] = Object.values(ROLES)

export const ADMIN_ROLES: readonly Role[] = [
  ROLES.IT_ADMIN,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
]

export const ROLE_AUTHORITY: Record<Role, number> = {
  [ROLES.EMPLOYEE]: 10,
  [ROLES.CHEF_DEPT]: 10,
  [ROLES.DIRECTOR]: 10,
  [ROLES.DG]: 10,
  [ROLES.RH]: 10,
  [ROLES.TREASURY]: 10,
  [ROLES.IT]: 10,
  [ROLES.MOYENS_GENERAUX]: 10,
  [ROLES.DAF]: 10,
  [ROLES.DGOF]: 10,
  [ROLES.IT_ADMIN]: 50,
  [ROLES.ADMIN]: 80,
  [ROLES.SUPER_ADMIN]: 100,
}

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.EMPLOYEE]: 'Employé',
  [ROLES.CHEF_DEPT]: 'Chef de département',
  [ROLES.DIRECTOR]: 'Directeur de division',
  [ROLES.DG]: 'Directeur Général',
  [ROLES.RH]: 'Ressources Humaines',
  [ROLES.TREASURY]: 'Trésorerie',
  [ROLES.IT]: 'Responsable / Équipe IT',
  [ROLES.MOYENS_GENERAUX]: 'Moyens Généraux',
  [ROLES.DAF]: 'DAF',
  [ROLES.DGOF]: 'DGOF',
  [ROLES.IT_ADMIN]: 'Administrateur IT',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.SUPER_ADMIN]: 'Super Administrateur',
}

export function isValidRole(role: string | null | undefined): role is Role {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role)
}

export function isAdminRole(role: string | null | undefined): boolean {
  return isValidRole(role) && ADMIN_ROLES.includes(role)
}
