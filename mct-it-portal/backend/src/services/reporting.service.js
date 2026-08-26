const { addBusinessDays, getRequestSla } = require('../utils/sla');
const { getWorkflowSteps } = require('../config/departments');
const {
  REQUEST_STATUSES,
  TERMINAL_STATUSES,
  ACTIVE_WORKFLOW_STATUSES,
  toPublicRequestType,
} = require('../config/request.constants');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const TERMINAL_STATUS_SET = new Set(TERMINAL_STATUSES);
const ACTIVE_STATUS_SET = new Set([
  ...ACTIVE_WORKFLOW_STATUSES,
  REQUEST_STATUSES.PROCESSING,
]);

function roundMetric(value) {
  return Math.round(value * 10) / 10;
}

function average(values) {
  return values.length > 0
    ? roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length)
    : null;
}

function percentage(numerator, denominator) {
  return denominator > 0 ? roundMetric((numerator / denominator) * 100) : null;
}

function parseDateOnly(value, fieldName) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${fieldName} doit respecter le format YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} contient une date invalide.`);
  }
  return date;
}

function parseReportingRange(query = {}, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultFrom = new Date(today);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);

  const from = query.from ? parseDateOnly(query.from, 'from') : defaultFrom;
  const to = query.to ? parseDateOnly(query.to, 'to') : today;
  const differenceDays = Math.floor((to - from) / DAY_MS);

  if (differenceDays < 0) {
    throw new Error('La date de début doit précéder la date de fin.');
  }
  if (differenceDays >= MAX_RANGE_DAYS) {
    throw new Error(`La période ne peut pas dépasser ${MAX_RANGE_DAYS} jours.`);
  }

  const toExclusive = new Date(to);
  toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);

  return {
    from,
    to,
    toExclusive,
    serialized: {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    },
  };
}

function hoursBetween(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const duration = (end - start) / (60 * 60 * 1000);
  return Number.isFinite(duration) && duration >= 0 ? duration : null;
}

function collectCompletedStepSamples(requests) {
  const samples = [];

  for (const request of requests) {
    const byRevision = new Map();
    for (const validation of request.validations || []) {
      const revision = validation.revision || 1;
      if (!byRevision.has(revision)) byRevision.set(revision, []);
      byRevision.get(revision).push(validation);
    }

    for (const validations of byRevision.values()) {
      validations.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt));
      for (let index = 1; index < validations.length; index += 1) {
        const previous = validations[index - 1];
        const current = validations[index];
        const hours = hoursBetween(previous.createdAt, current.createdAt);
        if (hours === null) continue;
        samples.push({
          stepLabel: current.stepLabel || `Étape ${current.step}`,
          hours,
          slaCompliant: new Date(current.createdAt) <= addBusinessDays(previous.createdAt, 2),
        });
      }
    }
  }

  return samples;
}

function computeReportingMetrics(requests, range, now = new Date()) {
  const operationalRequests = requests.filter((request) => request.status !== REQUEST_STATUSES.DRAFT);
  const rejected = operationalRequests.filter((request) => request.status === REQUEST_STATUSES.REJECTED);
  const terminalDurations = operationalRequests.flatMap((request) => {
    const end = request.status === REQUEST_STATUSES.CLOSED ? request.closedAt : request.rejectedAt;
    const hours = TERMINAL_STATUS_SET.has(request.status) && end
      ? hoursBetween(request.createdAt, end)
      : null;
    return hours === null ? [] : [hours];
  });

  const activeSlaSamples = [];
  let activeOverdue = 0;
  for (const request of operationalRequests) {
    if (!ACTIVE_STATUS_SET.has(request.status)) continue;
    let steps = [];
    try {
      steps = getWorkflowSteps(request.type, request.department);
    } catch {
      steps = [];
    }
    const sla = getRequestSla(request, steps, now);
    if (sla.targetAt) {
      activeSlaSamples.push(!sla.isOverdue);
      if (sla.isOverdue) activeOverdue += 1;
    }
  }

  const completedStepSamples = collectCompletedStepSamples(operationalRequests);
  const allSlaSamples = [
    ...completedStepSamples.map((sample) => sample.slaCompliant),
    ...activeSlaSamples,
  ];

  const typeGroups = new Map();
  const statusGroups = new Map();
  const stepGroups = new Map();

  for (const request of operationalRequests) {
    const type = toPublicRequestType(request.type);
    if (!typeGroups.has(type)) typeGroups.set(type, []);
    typeGroups.get(type).push(request);
    statusGroups.set(request.status, (statusGroups.get(request.status) || 0) + 1);
  }
  for (const sample of completedStepSamples) {
    if (!stepGroups.has(sample.stepLabel)) stepGroups.set(sample.stepLabel, []);
    stepGroups.get(sample.stepLabel).push(sample.hours);
  }

  return {
    range,
    summary: {
      total: operationalRequests.length,
      rejectionRate: percentage(rejected.length, operationalRequests.length),
      activeOverdue,
      slaComplianceRate: percentage(
        allSlaSamples.filter(Boolean).length,
        allSlaSamples.length
      ),
      averageProcessingHours: average(terminalDurations),
    },
    byType: Array.from(typeGroups.entries())
      .map(([type, groupedRequests]) => {
        const durations = groupedRequests.flatMap((request) => {
          const end = request.status === REQUEST_STATUSES.CLOSED ? request.closedAt : request.rejectedAt;
          const hours = TERMINAL_STATUS_SET.has(request.status) && end
            ? hoursBetween(request.createdAt, end)
            : null;
          return hours === null ? [] : [hours];
        });
        return {
          type,
          total: groupedRequests.length,
          rejected: groupedRequests.filter((request) => request.status === REQUEST_STATUSES.REJECTED).length,
          averageProcessingHours: average(durations),
        };
      })
      .sort((left, right) => left.type.localeCompare(right.type)),
    byStatus: Array.from(statusGroups.entries())
      .map(([status, total]) => ({ status, total }))
      .sort((left, right) => left.status.localeCompare(right.status)),
    byStep: Array.from(stepGroups.entries())
      .map(([stepLabel, hours]) => ({
        stepLabel,
        averageHours: average(hours),
        samples: hours.length,
      }))
      .sort((left, right) => left.stepLabel.localeCompare(right.stepLabel)),
  };
}

module.exports = {
  MAX_RANGE_DAYS,
  parseReportingRange,
  computeReportingMetrics,
};
