const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const {
  listRequests,
  getRequest,
  createRequest,
  validateRequest,
  closeRequestHandler,
  getStats,
} = require('../controllers/request.controller');
const { generatePdf } = require('../controllers/pdf.controller');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

router.get('/stats', getStats);
router.get('/', listRequests);
router.post('/', createRequest);
router.get('/:id', getRequest);
router.get('/:id/pdf', generatePdf);
router.post('/:id/validate', requireRole('CHEF_DEPT', 'DIRECTOR', 'DG', 'DRH', 'IT', 'ADMIN'), validateRequest);
router.post('/:id/close', requireRole('IT', 'ADMIN'), closeRequestHandler);

module.exports = router;
