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

router.use(auth);

router.get('/', listCustomers);
router.get('/:id', getCustomer);
router.post('/', requireRole('owner', 'manager', 'staff'), createCustomer);
router.put('/:id', requireRole('owner', 'manager', 'staff'), updateCustomer);
router.delete('/:id', requireRole('owner', 'manager'), deleteCustomer);

module.exports = router;
