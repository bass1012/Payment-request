const crypto = require('node:crypto');
const prisma = require('../config/database');
const { getWorkflowSteps } = require('../config/departments');
const { getRequestSla, countBusinessDays } = require('../utils/sla');
const { sendSlaNotificationEmail } = require('./email.service');
const { logger } = require('../utils/logger');
const { ACTIVE_WORKFLOW_STATUSES } = require('../config/request.constants');

const ACTIVE_STATUSES = ACTIVE_WORKFLOW_STATUSES;

function configuredThreshold(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 90 ? parsed : fallback;
}

function normalizeRecipient(value) {
  if (typeof value !== 'string') return '';
  const matches = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return matches ? [...new Set(matches.map(email => email.toLowerCase()))].join(',') : '';
}

function isValidRecipient(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+(?:\s*,\s*[^\s@]+@[^\s@]+\.[^\s@]+)*$/.test(value);
}

function recipientHash(recipient) {
  return crypto.createHash('sha256').update(recipient).digest('hex');
}

function isUniqueConflict(error) {
  return error?.code === 'P2002' || error?.code === 'SQLITE_CONSTRAINT';
}

async function claimAndSend({
  database,
  request,
  level,
  recipient,
  stepLabel,
  overdueBusinessDays,
  now,
  sendNotification,
  frontendUrl,
}) {
  let notification;
  try {
    notification = await database.slaNotification.create({
      data: {
        requestId: request.id,
        revision: request.currentRevision || 1,
        step: request.currentStep,
        level,
        status: 'PENDING',
        recipientHash: recipientHash(recipient),
      },
    });
  } catch (error) {
    if (isUniqueConflict(error)) return { outcome: 'duplicate', level };
    throw error;
  }

  let result;
  try {
    result = await sendNotification({
      to: recipient,
      level,
      request,
      stepLabel,
      overdueBusinessDays,
      frontendUrl,
    });
  } catch (err) {
    logger.debug('catch.silent', { context: 'sla-notification-send', notificationId: notification.id, error: err.message });
    result = { success: false };
  }

  if (result?.success) {
    await database.slaNotification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: now, lastErrorCode: null },
    });
    logger.info('sla_notification.sent', {
      requestId: request.id,
      revision: request.currentRevision || 1,
      step: request.currentStep,
      notificationLevel: level,
    });
    return { outcome: 'sent', level };
  }

  await database.slaNotification.update({
    where: { id: notification.id },
    data: {
      status: 'FAILED',
      failedAt: now,
      lastErrorCode: 'SMTP_SEND_FAILED',
    },
  });
  logger.warn('sla_notification.failed', {
    requestId: request.id,
    revision: request.currentRevision || 1,
    step: request.currentStep,
    notificationLevel: level,
  });
  return { outcome: 'failed', level };
}

async function runSlaNotifications(options = {}) {
  const database = options.database || prisma;
  const now = options.now || new Date();
  const sendNotification = options.sendNotification || sendSlaNotificationEmail;
  const reminderAfter = configuredThreshold(
    options.reminderAfter ?? process.env.SLA_REMINDER_OVERDUE_BUSINESS_DAYS,
    1
  );
  const escalationAfter = Math.max(
    reminderAfter + 1,
    configuredThreshold(
      options.escalationAfter ?? process.env.SLA_ESCALATION_OVERDUE_BUSINESS_DAYS,
      3
    )
  );
  const escalationRecipient = normalizeRecipient(
    options.escalationRecipient ?? process.env.SLA_ESCALATION_EMAIL
  );
  const frontendUrl = options.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

  const requests = await database.request.findMany({
    where: { status: { in: ACTIVE_STATUSES } },
    include: {
      requester: true,
      department: true,
      validations: { orderBy: { createdAt: 'asc' } },
    },
  });

  const outcomes = [];
  for (const request of requests) {
    const steps = getWorkflowSteps(request.type, request.department);
    const currentStep = steps[request.currentStep - 1];
    const sla = getRequestSla(request, steps, now);
    if (!sla.isOverdue || !sla.targetAt || !currentStep) continue;

    const overdueBusinessDays = countBusinessDays(new Date(sla.targetAt), now);
    const reminderRecipient = normalizeRecipient(currentStep.email);
    if (overdueBusinessDays >= reminderAfter && isValidRecipient(reminderRecipient)) {
      outcomes.push(await claimAndSend({
        database,
        request,
        level: 'REMINDER',
        recipient: reminderRecipient,
        stepLabel: currentStep.label,
        overdueBusinessDays,
        now,
        sendNotification,
        frontendUrl,
      }));
    }

    if (overdueBusinessDays >= escalationAfter && isValidRecipient(escalationRecipient)) {
      outcomes.push(await claimAndSend({
        database,
        request,
        level: 'ESCALATION',
        recipient: escalationRecipient,
        stepLabel: currentStep.label,
        overdueBusinessDays,
        now,
        sendNotification,
        frontendUrl,
      }));
    }
  }

  return {
    scanned: requests.length,
    sent: outcomes.filter(item => item.outcome === 'sent').length,
    failed: outcomes.filter(item => item.outcome === 'failed').length,
    duplicates: outcomes.filter(item => item.outcome === 'duplicate').length,
  };
}

module.exports = {
  ACTIVE_STATUSES,
  claimAndSend,
  configuredThreshold,
  runSlaNotifications,
};
