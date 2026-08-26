const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  getObligationsHandler,
  createObligationHandler,
  completeObligationHandler,
} = require('../controllers/obligation.controller');
const { asyncHandler } = require('../middleware/asyncHandler');

router.use(authMiddleware);

router.get('/', asyncHandler(getObligationsHandler));
router.post('/', asyncHandler(createObligationHandler));
router.patch('/:id/complete', asyncHandler(completeObligationHandler));

module.exports = router;
