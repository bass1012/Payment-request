/**
 * Metrics middleware — métriques légères en mémoire
 *
 * Track : temps de réponse, nombre de requêtes, taux d'erreur, files d'attente SLA.
 * Exposé via GET /api/metrics (admin only).
 */
const { logger } = require('../utils/logger');

const metrics = {
  requests: { total: 0, byStatus: {}, byMethod: {} },
  responseTime: { sum: 0, count: 0, min: Infinity, max: 0 },
  errors: { total: 0, by5xx: 0, by4xx: 0 },
  startTime: Date.now(),
  sla: { pending: 0, overdue: 0 },
};

function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  metrics.requests.total++;
  metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = durationNs / 1e6;

    metrics.responseTime.sum += durationMs;
    metrics.responseTime.count++;
    if (durationMs < metrics.responseTime.min) metrics.responseTime.min = durationMs;
    if (durationMs > metrics.responseTime.max) metrics.responseTime.max = durationMs;

    const status = res.statusCode;
    metrics.requests.byStatus[status] = (metrics.requests.byStatus[status] || 0) + 1;

    if (status >= 500) {
      metrics.errors.total++;
      metrics.errors.by5xx++;
    } else if (status >= 400) {
      metrics.errors.by4xx++;
    }
  });

  next();
}

function getMetrics() {
  const uptimeMs = Date.now() - metrics.startTime;
  const avgResponseTime = metrics.responseTime.count > 0
    ? metrics.responseTime.sum / metrics.responseTime.count
    : 0;
  const errorRate = metrics.requests.total > 0
    ? (metrics.errors.total / metrics.requests.total * 100).toFixed(2)
    : '0.00';

  return {
    uptime: `${Math.floor(uptimeMs / 1000)}s`,
    requests: {
      total: metrics.requests.total,
      byMethod: metrics.requests.byMethod,
      topStatus: Object.entries(metrics.requests.byStatus)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([status, count]) => ({ status: Number(status), count })),
    },
    responseTime: {
      avg: `${avgResponseTime.toFixed(1)}ms`,
      min: metrics.responseTime.min === Infinity ? '—' : `${metrics.responseTime.min.toFixed(1)}ms`,
      max: `${metrics.responseTime.max.toFixed(1)}ms`,
      samples: metrics.responseTime.count,
    },
    errors: {
      total: metrics.errors.total,
      rate: `${errorRate}%`,
      by5xx: metrics.errors.by5xx,
      by4xx: metrics.errors.by4xx,
    },
    sla: metrics.sla,
  };
}

function updateSlaMetrics(pending, overdue) {
  metrics.sla.pending = pending;
  metrics.sla.overdue = overdue;
}

module.exports = { metricsMiddleware, getMetrics, updateSlaMetrics };
