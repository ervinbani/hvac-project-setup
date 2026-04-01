const express = require('express');
const router = express.Router();
const {
  listServices,
  createService,
  updateService,
  deleteService,
} = require('../controllers/services.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const ADMIN = ['owner', 'director', 'manager_operations', 'manager_hr'];

router.use(auth);

router.get('/', listServices);
router.post('/', requireRole(...ADMIN), createService);
router.put('/:id', requireRole(...ADMIN), updateService);
router.delete('/:id', requireRole(...ADMIN), deleteService);

module.exports = router;
