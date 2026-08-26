const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { getReporting } = require('../controllers/reporting.controller');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN', 'IT'));
router.get('/', asyncHandler(getReporting));

module.exports = router;
