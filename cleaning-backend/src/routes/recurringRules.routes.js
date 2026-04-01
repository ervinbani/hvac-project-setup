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

const ADMIN       = ['owner', 'director', 'manager_operations', 'manager_hr'];
const ADMIN_STAFF = [...ADMIN, 'staff'];

router.use(auth);

router.get('/', listRecurringRules);
router.post('/', requireRole(...ADMIN_STAFF), createRecurringRule);
router.put('/:id', requireRole(...ADMIN_STAFF), updateRecurringRule);
router.delete('/:id', requireRole(...ADMIN), deleteRecurringRule);

module.exports = router;
