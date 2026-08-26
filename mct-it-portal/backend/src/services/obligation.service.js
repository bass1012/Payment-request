const prisma = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Créer une obligation d'exécution post-approbation
 */
async function createObligation({ requestId, title, description = '', assigneeEmail, dueDate }) {
  if (!requestId || !title || !assigneeEmail || !dueDate) {
    throw new Error('Champs obligatoires manquants pour la création de l\'obligation');
  }

  const due = new Date(dueDate);
  if (isNaN(due.getTime())) {
    throw new Error('Date d\'échéance invalide');
  }

  const obligation = await prisma.obligation.create({
    data: {
      requestId,
      title: title.trim(),
      description: description ? description.trim() : null,
      assigneeEmail: assigneeEmail.toLowerCase().trim(),
      dueDate: due,
      status: 'PENDING',
    },
    include: {
      request: { select: { id: true, reference: true, type: true } },
    },
  });

  logger.info('obligation.created', { obligationId: obligation.id, requestId, assigneeEmail });
  return obligation;
}

/**
 * Lister les obligations avec filtres
 */
async function listObligations({ assigneeEmail, status, requestId } = {}) {
  const where = {};
  if (assigneeEmail) where.assigneeEmail = assigneeEmail.toLowerCase().trim();
  if (status) where.status = status;
  if (requestId) where.requestId = requestId;

  const obligations = await prisma.obligation.findMany({
    where,
    include: {
      request: { select: { id: true, reference: true, type: true, status: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const now = new Date();
  return obligations.map((o) => {
    const isOverdue = o.status === 'PENDING' && new Date(o.dueDate) < now;
    return {
      ...o,
      isOverdue,
      effectiveStatus: isOverdue ? 'OVERDUE' : o.status,
    };
  });
}

/**
 * Marquer une obligation comme exécutée / clôturée
 */
async function completeObligation(obligationId) {
  const obligation = await prisma.obligation.findUnique({
    where: { id: obligationId },
  });

  if (!obligation) throw new Error('Obligation introuvable');

  return prisma.obligation.update({
    where: { id: obligationId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });
}

module.exports = {
  createObligation,
  listObligations,
  completeObligation,
};
