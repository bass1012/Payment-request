const prisma = require('../config/database');
const {
  parseReportingRange,
  computeReportingMetrics,
} = require('../services/reporting.service');

function createReportingHandler(database = prisma, clock = () => new Date()) {
  return async function getReporting(req, res, next) {
    let range;
    try {
      range = parseReportingRange(req.query, clock());
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    try {
      const requests = await database.request.findMany({
        where: {
          status: { not: 'DRAFT' },
          createdAt: {
            gte: range.from,
            lt: range.toExclusive,
          },
        },
        select: {
          type: true,
          status: true,
          currentStep: true,
          currentRevision: true,
          createdAt: true,
          closedAt: true,
          rejectedAt: true,
          department: true,
          validations: {
            select: {
              revision: true,
              step: true,
              stepLabel: true,
              action: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      return res.json(computeReportingMetrics(requests, range.serialized, clock()));
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  createReportingHandler,
  getReporting: createReportingHandler(),
};
