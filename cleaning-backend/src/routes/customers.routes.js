const express = require('express');
const router = express.Router();
const {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customers.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const ADMIN       = ['owner', 'director', 'manager_operations', 'manager_hr'];
const ADMIN_STAFF = [...ADMIN, 'staff'];

router.use(auth);

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.post('/', requireRole(...ADMIN_STAFF), createCustomer);
router.put('/:id', requireRole(...ADMIN_STAFF), updateCustomer);
router.delete('/:id', requireRole(...ADMIN), deleteCustomer);

module.exports = router;
