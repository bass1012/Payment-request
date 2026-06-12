const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth.middleware');
const { listUsers, createUser, updateUser, listDepartments } = require('../controllers/admin.controller');
const { listRequests } = require('../controllers/request.controller');

router.use(authMiddleware);
router.use(requireRole('ADMIN', 'IT'));

router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);
router.get('/departments', listDepartments);

// Vue admin de toutes les demandes (ignorant le filtre rôle)
router.get('/requests', (req, res, next) => {
  req.user.role = 'ADMIN'; // force vue globale
  next();
}, listRequests);

module.exports = router;
