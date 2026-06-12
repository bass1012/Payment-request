export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'EMPLOYEE' | 'MANAGER' | 'DIRECTOR' | 'IT_ADMIN' | 'SUPER_ADMIN'
  department?: string | { id: string; name: string; code: string; [key: string]: unknown }
  position?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export type RequestType = 'ASSET' | 'EMAIL' | 'PRINT' | 'OTHER'

export type RequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VALIDATION_N1'
  | 'VALIDATION_N2'
  | 'VALIDATION_DG'
  | 'IN_PROGRESS_IT'
  | 'CLOSED'
  | 'REJECTED'

export interface ValidationEntry {
  id: string
  level: number
  validatorName: string
  validatorEmail: string
  action: 'APPROVED' | 'REJECTED'
  comment?: string
  createdAt: string
}

export interface Request {
  id: string
  referenceNumber: string
  type: RequestType
  status: RequestStatus
  createdAt: string
  updatedAt: string
  requesterName: string
  requesterEmail: string
  department: string
  position?: string
  matricule?: string
  // ENR.SI.005
  memoNumber?: string
  // ENR.SI.006
  printObject?: string
  copiesA4?: number
  copiesA3?: number
  // ENR.SI.008
  itAssets?: string
  softwareLicenses?: string
  accessPrivileges?: string
  requestReason?: string
  // OTHER
  description?: string
  validations: ValidationEntry[]
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  VALIDATION_N1: 'Validation N+1',
  VALIDATION_N2: 'Validation N+2',
  VALIDATION_DG: 'Validation DG',
  IN_PROGRESS_IT: 'En cours IT',
  CLOSED: 'Clôturée',
  REJECTED: 'Rejetée',
}

export const TYPE_LABELS: Record<RequestType, string> = {
  ASSET: 'Actif informatique (ENR.SI.008)',
  EMAIL: 'Adresse électronique (ENR.SI.005)',
  PRINT: 'Impression couleur (ENR.SI.006)',
  OTHER: 'Autre demande IT',
}

export const STATUS_BADGE_CLASS: Record<RequestStatus, string> = {
  DRAFT: 'badge-draft',
  SUBMITTED: 'badge-submitted',
  VALIDATION_N1: 'badge-pending',
  VALIDATION_N2: 'badge-pending',
  VALIDATION_DG: 'badge-pending',
  IN_PROGRESS_IT: 'badge-in-progress',
  CLOSED: 'badge-closed',
  REJECTED: 'badge-rejected',
}
