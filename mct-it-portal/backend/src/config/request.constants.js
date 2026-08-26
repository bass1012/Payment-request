const REQUEST_TYPES = Object.freeze({
  EMAIL: 'ENR_SI_005',
  PRINT: 'ENR_SI_006',
  ASSET: 'ENR_SI_008',
  CASH: 'ENR_RF_002',
  SUPPLY: 'ENR_GA_003',
  OTHER: 'AUTRE',
});

const REQUEST_STATUSES = Object.freeze({
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
});

const VALIDATION_ACTIONS = Object.freeze({
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  REQUEST_CORRECTION: 'REQUEST_CORRECTION',
});


const PUBLIC_TO_INTERNAL_TYPE = Object.freeze({ ...REQUEST_TYPES });
const INTERNAL_TO_PUBLIC_TYPE = Object.freeze(
  Object.fromEntries(Object.entries(REQUEST_TYPES).map(([publicType, internalType]) => [
    internalType,
    publicType,
  ]))
);

const VALID_REQUEST_TYPES = Object.freeze(Object.values(REQUEST_TYPES));
const VALID_PUBLIC_REQUEST_TYPES = Object.freeze(Object.keys(REQUEST_TYPES));
const VALID_REQUEST_STATUSES = Object.freeze(Object.values(REQUEST_STATUSES));
const VALID_VALIDATION_ACTIONS = Object.freeze(Object.values(VALIDATION_ACTIONS));

const TERMINAL_STATUSES = Object.freeze([
  REQUEST_STATUSES.CLOSED,
  REQUEST_STATUSES.REJECTED,
]);
const ACTIVE_WORKFLOW_STATUSES = Object.freeze([
  REQUEST_STATUSES.SUBMITTED,
  REQUEST_STATUSES.VALIDATION_N1,
  REQUEST_STATUSES.VALIDATION_N2,
  REQUEST_STATUSES.VALIDATION_DG,
  REQUEST_STATUSES.PENDING_PAYMENT,
  REQUEST_STATUSES.IN_PROGRESS_IT,
]);
const COMPLETED_STATUSES = TERMINAL_STATUSES;

const STATUS_LABELS = Object.freeze({
  [REQUEST_STATUSES.DRAFT]: 'Brouillon',
  [REQUEST_STATUSES.SUBMITTED]: 'Soumise',
  [REQUEST_STATUSES.VALIDATION_N1]: 'Validation N+1',
  [REQUEST_STATUSES.VALIDATION_N2]: 'Validation N+2',
  [REQUEST_STATUSES.VALIDATION_DG]: 'Validation DG',
  [REQUEST_STATUSES.PENDING_PAYMENT]: 'En attente de paiement',
  [REQUEST_STATUSES.IN_PROGRESS_IT]: 'En cours IT',
  [REQUEST_STATUSES.PROCESSING]: 'En cours de traitement',
  [REQUEST_STATUSES.CLOSED]: 'Clôturée',
  [REQUEST_STATUSES.REJECTED]: 'Rejetée',
  [REQUEST_STATUSES.CORRECTION_REQUESTED]: 'Correction demandée',
});


const TYPE_LABELS = Object.freeze({
  ASSET: 'Actif informatique (ENR.SI.008)',
  EMAIL: 'Adresse électronique (ENR.SI.005)',
  PRINT: 'Impression couleur (ENR.SI.006)',
  CASH: 'Bon de Caisse (ENR.RF.002)',
  SUPPLY: "Demande d'approvisionnement (ENR.GA.003)",
  OTHER: 'Autre demande IT',
});

function toInternalRequestType(type) {
  return PUBLIC_TO_INTERNAL_TYPE[type] || type;
}

function toPublicRequestType(type) {
  return INTERNAL_TO_PUBLIC_TYPE[type] || type;
}

function isValidRequestType(type) {
  return VALID_REQUEST_TYPES.includes(toInternalRequestType(type));
}

function isValidRequestStatus(status) {
  return VALID_REQUEST_STATUSES.includes(status);
}

function isValidValidationAction(action) {
  return VALID_VALIDATION_ACTIONS.includes(action);
}

module.exports = {
  REQUEST_TYPES,
  REQUEST_STATUSES,
  VALIDATION_ACTIONS,
  PUBLIC_TO_INTERNAL_TYPE,
  INTERNAL_TO_PUBLIC_TYPE,
  VALID_REQUEST_TYPES,
  VALID_PUBLIC_REQUEST_TYPES,
  VALID_REQUEST_STATUSES,
  VALID_VALIDATION_ACTIONS,
  TERMINAL_STATUSES,
  ACTIVE_WORKFLOW_STATUSES,
  COMPLETED_STATUSES,
  STATUS_LABELS,
  TYPE_LABELS,
  toInternalRequestType,
  toPublicRequestType,
  isValidRequestType,
  isValidRequestStatus,
  isValidValidationAction,
};

