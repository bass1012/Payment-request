export const REQUEST_TYPES = {
  ASSET: 'ASSET',
  EMAIL: 'EMAIL',
  PRINT: 'PRINT',
  CASH: 'CASH',
  SUPPLY: 'SUPPLY',
  OTHER: 'OTHER',
} as const

export type RequestType = (typeof REQUEST_TYPES)[keyof typeof REQUEST_TYPES]

export const VALID_REQUEST_TYPES: readonly RequestType[] = Object.values(REQUEST_TYPES)

export const REQUEST_STATUSES = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  VALIDATION_N1: 'VALIDATION_N1',
  VALIDATION_N2: 'VALIDATION_N2',
  VALIDATION_DG: 'VALIDATION_DG',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  IN_PROGRESS_IT: 'IN_PROGRESS_IT',
  PROCESSING: 'PROCESSING',
  CLOSED: 'CLOSED',
  REJECTED: 'REJECTED',
  CORRECTION_REQUESTED: 'CORRECTION_REQUESTED',
} as const

export type RequestStatus = (typeof REQUEST_STATUSES)[keyof typeof REQUEST_STATUSES]

export const VALID_REQUEST_STATUSES: readonly RequestStatus[] = Object.values(REQUEST_STATUSES)

export const VALIDATION_ACTIONS = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REQUEST_CORRECTION: 'REQUEST_CORRECTION',
} as const

export type ValidationAction = (typeof VALIDATION_ACTIONS)[keyof typeof VALIDATION_ACTIONS]

export const STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  VALIDATION_N1: 'Validation N+1',
  VALIDATION_N2: 'Validation N+2',
  VALIDATION_DG: 'Validation DG',
  PENDING_PAYMENT: 'En attente de paiement',
  IN_PROGRESS_IT: 'En cours IT',
  PROCESSING: 'En cours de traitement',
  CLOSED: 'Clôturée',
  REJECTED: 'Rejetée',
  CORRECTION_REQUESTED: 'Correction demandée',
}

export const TYPE_LABELS: Record<RequestType, string> = {
  ASSET: 'Actif informatique (ENR.SI.008)',
  EMAIL: 'Adresse électronique (ENR.SI.005)',
  PRINT: 'Impression couleur (ENR.SI.006)',
  CASH: 'Bon de Caisse (ENR.RF.002)',
  SUPPLY: "Demande d'approvisionnement (ENR.GA.003)",
  OTHER: 'Autre demande IT',
}

export const STATUS_BADGE_CLASS: Record<RequestStatus, string> = {
  DRAFT: 'badge-draft',
  SUBMITTED: 'badge-submitted',
  VALIDATION_N1: 'badge-pending',
  VALIDATION_N2: 'badge-pending',
  VALIDATION_DG: 'badge-pending',
  PENDING_PAYMENT: 'badge-payment',
  IN_PROGRESS_IT: 'badge-in-progress',
  PROCESSING: 'badge-in-progress',
  CLOSED: 'badge-closed',
  REJECTED: 'badge-rejected',
  CORRECTION_REQUESTED: 'bg-amber-100 text-amber-800 border-amber-200',
}


export const TERMINAL_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUSES.CLOSED,
  REQUEST_STATUSES.REJECTED,
]

export const ACTIVE_WORKFLOW_STATUSES: readonly RequestStatus[] = [
  REQUEST_STATUSES.SUBMITTED,
  REQUEST_STATUSES.VALIDATION_N1,
  REQUEST_STATUSES.VALIDATION_N2,
  REQUEST_STATUSES.VALIDATION_DG,
  REQUEST_STATUSES.PENDING_PAYMENT,
  REQUEST_STATUSES.IN_PROGRESS_IT,
]

export const COMPLETED_STATUSES = TERMINAL_STATUSES

export function isRequestType(value: string | null | undefined): value is RequestType {
  return typeof value === 'string' && (VALID_REQUEST_TYPES as readonly string[]).includes(value)
}

export function isRequestStatus(value: string | null | undefined): value is RequestStatus {
  return typeof value === 'string' && (VALID_REQUEST_STATUSES as readonly string[]).includes(value)
}
