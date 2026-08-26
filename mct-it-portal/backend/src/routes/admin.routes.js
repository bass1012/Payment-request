const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const {
  listUsers,
  createUser,
  updateUser,
  listDepartments,
  runSlaNotificationsHandler,
} = require('../controllers/admin.controller');
const { listRequests } = require('../controllers/request.controller');
const { asyncHandler } = require('../middleware/asyncHandler');

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/users', asyncHandler(listUsers));
router.post('/users', asyncHandler(createUser));
router.patch('/users/:id', asyncHandler(updateUser));
router.get('/departments', asyncHandler(listDepartments));
router.post('/sla/run', asyncHandler(runSlaNotificationsHandler));

// Vue admin de toutes les demandes (ignorant le filtre rôle)
router.get('/requests', (req, res, next) => {
  req.user.role = 'ADMIN'; // force vue globale
  req.isGlobalAdminView = true;
  next();
}, asyncHandler(listRequests));

module.exports = router;
