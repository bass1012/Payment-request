const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const {
  getDelegationsHandler,
  createDelegationHandler,
  revokeDelegationHandler,
} = require('../controllers/delegation.controller');
const { asyncHandler } = require('../middleware/asyncHandler');

router.use(authMiddleware);

router.get('/', asyncHandler(getDelegationsHandler));
router.post('/', asyncHandler(createDelegationHandler));
router.delete('/:id', asyncHandler(revokeDelegationHandler));

module.exports = router;
