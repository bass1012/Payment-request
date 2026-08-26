const {
  REQUEST_STATUSES,
  TERMINAL_STATUSES,
} = require('../config/request.constants');

const DAY_MS = 24 * 60 * 60 * 1000;
const TERMINAL_STATUS_SET = new Set(TERMINAL_STATUSES);
const DEFAULT_TARGETS = {
  [REQUEST_STATUSES.SUBMITTED]: 2,
  [REQUEST_STATUSES.VALIDATION_N1]: 2,
  [REQUEST_STATUSES.VALIDATION_N2]: 2,
  [REQUEST_STATUSES.VALIDATION_DG]: 2,
  [REQUEST_STATUSES.PENDING_PAYMENT]: 2,
  [REQUEST_STATUSES.IN_PROGRESS_IT]: 5,
  [REQUEST_STATUSES.PROCESSING]: 5,
};

function targetForStatus(status) {
  const environmentKey = `SLA_${status}_BUSINESS_DAYS`;
  const configured = Number.parseInt(process.env[environmentKey], 10);
  if (Number.isInteger(configured) && configured > 0 && configured <= 90) {
    return configured;
  }
  return DEFAULT_TARGETS[status] || null;
}

function addBusinessDays(value, businessDays) {
  const result = new Date(value);
  let remaining = businessDays;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

function countBusinessDays(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return 0;

  const cursor = new Date(start);
  let count = 0;
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (cursor > end) break;
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

function getStageStartedAt(request) {
  const currentRevision = request.currentRevision || 1;
  const validations = Array.isArray(request.validations) ? request.validations : [];
  const latestCurrentRevisionValidation = validations
    .filter(validation => (validation.revision || 1) === currentRevision)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))[0];

  return latestCurrentRevisionValidation?.createdAt || request.createdAt;
}

function getBlockerLabel(request, steps) {
  if (request.status === REQUEST_STATUSES.DRAFT) return 'Soumission par le demandeur';
  if (request.status === REQUEST_STATUSES.PROCESSING) return 'Traitement opérationnel';
  if (TERMINAL_STATUS_SET.has(request.status)) return null;
  return steps[request.currentStep - 1]?.label || 'Étape métier en cours';
}

function getRequestSla(request, steps, now = new Date()) {
  const targetBusinessDays = targetForStatus(request.status);
  const stageStartedAt = new Date(getStageStartedAt(request));
  const requestCreatedAt = new Date(request.createdAt);
  const targetAt = targetBusinessDays ? addBusinessDays(stageStartedAt, targetBusinessDays) : null;

  return {
    targetBusinessDays,
    stageStartedAt: stageStartedAt.toISOString(),
    targetAt: targetAt?.toISOString() || null,
    stageAgeBusinessDays: countBusinessDays(stageStartedAt, now),
    requestAgeDays: Math.max(0, Math.floor((now - requestCreatedAt) / DAY_MS)),
    isOverdue: Boolean(targetAt && !TERMINAL_STATUS_SET.has(request.status) && now > targetAt),
    blockerLabel: getBlockerLabel(request, steps),
  };
}

module.exports = {
  addBusinessDays,
  countBusinessDays,
  getRequestSla,
  targetForStatus,
};
