const express = require('express');
const router = express.Router();
const {
  listRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
} = require('../controllers/recurringRules.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

router.get('/', listRecurringRules);
router.post('/', requireRole('owner', 'manager', 'staff'), createRecurringRule);
router.put('/:id', requireRole('owner', 'manager', 'staff'), updateRecurringRule);
router.delete('/:id', requireRole('owner', 'manager'), deleteRecurringRule);

module.exports = router;
