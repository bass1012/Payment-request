import { Role } from '../constants/roles'
import {
  RequestType,
  RequestStatus,
  REQUEST_TYPES,
  VALID_REQUEST_TYPES,
  STATUS_LABELS,
  TYPE_LABELS,
  STATUS_BADGE_CLASS,
  isRequestType,
  isRequestStatus,
} from '../constants/requests'

export type { Role, RequestType, RequestStatus }
export {
  REQUEST_TYPES,
  VALID_REQUEST_TYPES,
  STATUS_LABELS,
  TYPE_LABELS,
  STATUS_BADGE_CLASS,
  isRequestType,
  isRequestStatus,
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: Role
  department?: string | { id: string; name: string; code: string; [key: string]: unknown }
  position?: string
  matricule?: string
  fonction?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}


export interface ValidationEntry {
  id: string
  level: number
  validatorName: string
  validatorEmail: string
  authorizationMode?: 'DIRECT' | 'DELEGATED' | 'ADMIN_OVERRIDE'
  delegationId?: string | null
  delegatorName?: string | null
  delegatorEmail?: string | null
  delegationScope?: string | null
  action: 'APPROVED' | 'REJECTED'
  comment?: string
  createdAt: string
}

export interface SignatureAuditLogEntry {
  id: string
  auditKey: string
  requestId: string
  revision: number
  step: number
  stepLabel: string
  action: 'APPROVED' | 'REJECTED' | string
  validatorId?: string | null
  validatorName: string
  validatorEmail: string
  validatorRole?: string | null
  authorizationMode?: 'DIRECT' | 'DELEGATED' | 'ADMIN_OVERRIDE'
  delegationId?: string | null
  delegatorName?: string | null
  delegatorEmail?: string | null
  delegationScope?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  documentHash: string
  consentText: string
  consentGiven: boolean
  comment?: string | null
  createdAt: string
}

export interface WorkflowStep {
  step: number
  label: string
  email: string | null
  name: string | null
  type: string
}

export interface RequestSla {
  targetBusinessDays: number | null
  stageStartedAt: string
  targetAt: string | null
  stageAgeBusinessDays: number
  requestAgeDays: number
  isOverdue: boolean
  blockerLabel: string | null
}

export interface RequestAttachment {
  id?: string
  name: string
  path: string
  mimeType?: string
  size?: number
  kind?: string
  createdAt?: string
}

export interface RequestRevisionEntry {
  id: string
  requestId: string
  revision: number
  reason: string
  snapshot: string
  createdById: string
  createdByName: string
  createdByEmail: string
  createdAt: string
}

export interface Request {
  id: string
  requesterId: string
  referenceNumber: string
  type: RequestType
  status: RequestStatus
  currentStep: number
  version?: number
  currentRevision?: number
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
  sla?: RequestSla
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
  nextValidatorEmail?: string | null
  nextValidatorRole?: string | null
  canCurrentUserValidate?: boolean
  validationAuthority?: {
    mode: 'DIRECT' | 'DELEGATED' | 'ADMIN_OVERRIDE' | 'DENIED'
    delegationId?: string | null
    delegationScope?: string | null
    delegatorName?: string | null
    delegatorEmail?: string | null
  }
  workflowSteps?: WorkflowStep[]
  paymentAmount?: number | null
  requestedAmount?: number | null
  paymentReference?: string | null
  paymentComment?: string | null
  paymentValidatedAt?: string | null
  uploadedPdfPath?: string | null
  attachments?: RequestAttachment[]
  proformas?: Array<{ name: string; path: string }>
  memoMaterial?: string
  memoSpecs?: string
  memoScreenSize?: string
  memoAccessories?: string
  memoSentAt?: string
  // ENR.GA.003
  allocationSection?: string
  expenseNature?: string[]
  items?: Array<{ designation: string; quantity: number; price: number }>
  possibleSuppliers?: string[]
  consultedSubcontractors?: string[]
  deliveryAddress?: string
  offersAmount?: number
  linkedAssetRequestId?: string
  linkedAssetRequestRef?: string
  linkedAssets?: Array<{ id: string; ref: string }>
  validations: ValidationEntry[]
  revisions?: RequestRevisionEntry[]
  signatureAuditLogs?: SignatureAuditLogEntry[]
}



export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}



export function isUserTurnMatch(expectedEmailsStr?: string | null, userEmail?: string | null): boolean {
  if (!expectedEmailsStr || !userEmail) return false;

  const userEmailClean = userEmail.toLowerCase().trim();
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = expectedEmailsStr.match(emailRegex);

  if (!matches) {
    return expectedEmailsStr
      .split(',')
      .map(e => e.trim().toLowerCase())
      .includes(userEmailClean);
  }

  return matches.map(e => e.toLowerCase().trim()).includes(userEmailClean);
}

export function getStatusLabel(r: Request, currentUserEmail?: string): string {
  // 1. Priorité à la décision de l'utilisateur connecté
  if (
    r.canCurrentUserValidate === true
    || (currentUserEmail && r.nextValidatorEmail && isUserTurnMatch(r.nextValidatorEmail, currentUserEmail))
  ) {
    return r.status === 'PENDING_PAYMENT' ? 'Votre règlement requis' : 'Votre décision requise';
  }

  // 2. Si la demande est en cours de validation, afficher l'étape exacte (direction/fonction)
  if (
    ['VALIDATION_N1', 'VALIDATION_N2', 'VALIDATION_DG'].includes(r.status) &&
    r.workflowSteps &&
    r.currentStep
  ) {
    const currentStepDef = r.workflowSteps[r.currentStep - 1];
    if (currentStepDef) {
      return `Validation : ${currentStepDef.label}`;
    }
  }

  // 3. Statut standard par défaut
  return STATUS_LABELS[r.status];
}
