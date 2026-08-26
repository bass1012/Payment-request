require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth.routes');
const requestRoutes = require('./routes/requests.routes');
const commentRoutes = require('./routes/comment.routes');
const templateRoutes = require('./routes/template.routes');
const adminRoutes = require('./routes/admin.routes');
const reportingRoutes = require('./routes/reporting.routes');
const delegationRoutes = require('./routes/delegation.routes');
const prisma = require('./config/database');
const { logger, requestContextMiddleware } = require('./utils/logger');
const { toHttpError } = require('./utils/errors');
const { metricsMiddleware, getMetrics } = require('./middleware/metrics');

const app = express(); // nosemgrep
const PORT = process.env.PORT || 3001;

// Métriques (avant les routes)
app.use(metricsMiddleware);

// Sécurité
app.use(helmet());
app.use(cookieParser());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes' },
}));

// Rate limiter pour les opérations d'écriture (submit, validate, upload)
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop d\'opérations d\'écriture, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});
app.set('writeLimiter', writeLimiter);

// CORS — autoriser le frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestContextMiddleware);

// Serve uploads securely
const { authMiddleware, requireRole } = require('./middleware/auth.middleware');
const { serveUploadSecure } = require('./controllers/request.controller');
const obligationRoutes = require('./routes/obligation.routes');
const documentCenterRoutes = require('./routes/document-center.routes');
app.get(['/uploads/*', '/api/uploads/*'], authMiddleware, serveUploadSecure);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/requests/:id/comments', commentRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/delegations', delegationRoutes);
app.use('/api/obligations', obligationRoutes);
app.use('/api/documents', documentCenterRoutes);


// Route de santé : confirme que l'API répond et que Prisma joint la base.
async function healthCheck(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      checks: { api: 'ok', database: 'ok' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('health.database_unavailable', { error });
    return res.status(503).json({
      status: 'degraded',
      checks: { api: 'ok', database: 'error' },
      timestamp: new Date().toISOString(),
    });
  }
}

app.get('/health', healthCheck); // Public — load balancer
app.get('/api/health', authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN'), healthCheck); // Authenticated — admin only
app.get('/api/metrics', authMiddleware, requireRole('ADMIN', 'SUPER_ADMIN', 'IT_ADMIN'), (req, res) => {
  res.json(getMetrics());
});

// Gestion des erreurs globale
app.use((err, req, res, next) => {
  // Erreurs multer (fichier trop volumineux, MIME invalide, etc.)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Fichier trop volumineux (maximum 10 Mo)' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Trop de fichiers (maximum 20)' });
  }
  if (err.message && err.message.includes('Type de fichier non autorisé')) {
    return res.status(400).json({ error: err.message });
  }
  const { statusCode, body } = toHttpError(err);
  if (statusCode >= 500) {
    logger.error('http.unhandled_error', {
      error: err,
      method: req.method,
      route: req.originalUrl,
    });
  } else {
    logger.warn('http.client_error', {
      message: err.message,
      code: body.code,
      method: req.method,
      route: req.originalUrl,
    });
  }
  res.status(statusCode).json(body);
});

module.exports = app;
