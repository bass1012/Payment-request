const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth.middleware');
const { getDocumentsCenterHandler } = require('../controllers/document-center.controller');
const { asyncHandler } = require('../middleware/asyncHandler');

router.use(authMiddleware);

router.get('/', asyncHandler(getDocumentsCenterHandler));

module.exports = router;
