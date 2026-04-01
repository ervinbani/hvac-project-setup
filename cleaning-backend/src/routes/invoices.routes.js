const express = require('express');
const router = express.Router();
const {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  sendInvoice,
  deleteInvoice,
} = require('../controllers/invoices.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const ADMIN_STAFF = ['owner', 'director', 'manager_operations', 'manager_hr', 'staff'];

router.use(auth);

router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post('/', requireRole(...ADMIN_STAFF), createInvoice);
router.put('/:id', requireRole(...ADMIN_STAFF), updateInvoice);
router.post('/:id/send', requireRole(...ADMIN_STAFF), sendInvoice);
router.delete('/:id', requireRole('owner'), deleteInvoice);

module.exports = router;
