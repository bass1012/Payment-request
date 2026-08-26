const express = require('express');
const path = require('path');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/asyncHandler');
const writeLimiter = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop d\'opérations d\'écriture, réessayez dans 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});
const { validate } = require('../middleware/validate');
const { createRequestSchema, validateRequestSchema } = require('../config/validation-schemas');
const { uploadFiles, verifyMagicBytes } = require('../config/multer');
const {
  listRequests,
  getRequest,
  createRequest,
  validateRequest,
  closeRequestHandler,
  getStats,
  exportRequestsCSV,
  downloadAuditCertificate,
  deleteRequest,
  cancelRequest,
  updateRequest,
  reviseRequest,
  createDraft,
  getLatestDraft,
  updateDraft,
  submitDraft,
} = require('../controllers/request.controller');
const { generatePdf } = require('../controllers/pdf.controller');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

router.get('/stats', asyncHandler(getStats));
router.get('/export/csv', requireRole('ADMIN', 'IT', 'TREASURY', 'MOYENS_GENERAUX'), asyncHandler(exportRequestsCSV));
router.get('/drafts/latest', asyncHandler(getLatestDraft));
router.post('/drafts', writeLimiter, asyncHandler(createDraft));
router.put('/drafts/:id', writeLimiter, asyncHandler(updateDraft));
router.post('/drafts/:id/submit', writeLimiter, uploadFiles(
  path.resolve(__dirname, '../../uploads/requests'),
  path.resolve(__dirname, '../../uploads/attachments')
), verifyMagicBytes, asyncHandler(submitDraft));
router.get('/', asyncHandler(listRequests));
router.post('/', writeLimiter, validate(createRequestSchema), uploadFiles(
  path.resolve(__dirname, '../../uploads/requests'),
  path.resolve(__dirname, '../../uploads/attachments')
), verifyMagicBytes, asyncHandler(createRequest));
router.get('/:id', asyncHandler(getRequest));
router.put('/:id', writeLimiter, asyncHandler(updateRequest));
router.post('/:id/revisions', writeLimiter, uploadFiles(
  path.resolve(__dirname, '../../uploads/requests'),
  path.resolve(__dirname, '../../uploads/attachments')
), verifyMagicBytes, asyncHandler(reviseRequest));
router.post('/:id/cancel', writeLimiter, asyncHandler(cancelRequest));
router.get('/:id/pdf', asyncHandler(generatePdf));
router.get('/:id/certificate', asyncHandler(downloadAuditCertificate));
// L'autorisation métier est résolue dans le contrôleur afin de prendre en charge
// une délégation explicite sans élargir les droits du délégataire.
router.post('/:id/validate', writeLimiter, validate(validateRequestSchema), asyncHandler(validateRequest));
router.post('/:id/close', writeLimiter, requireRole('IT', 'ADMIN'), asyncHandler(closeRequestHandler));
router.delete('/:id', writeLimiter, requireRole('ADMIN'), asyncHandler(deleteRequest));

module.exports = router;
