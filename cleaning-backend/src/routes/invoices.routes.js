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

router.use(auth);

router.get('/', listInvoices);
router.get('/:id', getInvoice);
router.post('/', requireRole('owner', 'manager', 'staff'), createInvoice);
router.put('/:id', requireRole('owner', 'manager', 'staff'), updateInvoice);
router.post('/:id/send', requireRole('owner', 'manager', 'staff'), sendInvoice);
router.delete('/:id', requireRole('owner'), deleteInvoice);

module.exports = router;
