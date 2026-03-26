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

router.use(auth);

router.get('/', listServices);
router.post('/', requireRole('owner', 'manager'), createService);
router.put('/:id', requireRole('owner', 'manager'), updateService);
router.delete('/:id', requireRole('owner', 'manager'), deleteService);

module.exports = router;
