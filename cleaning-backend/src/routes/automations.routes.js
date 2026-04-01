const express = require('express');
const router = express.Router();
const {
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
} = require('../controllers/automations.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const ADMIN = ['owner', 'director', 'manager_operations', 'manager_hr'];

router.use(auth);

router.get('/', listAutomations);
router.post('/', requireRole(...ADMIN), createAutomation);
router.put('/:id', requireRole(...ADMIN), updateAutomation);
router.delete('/:id', requireRole(...ADMIN), deleteAutomation);

module.exports = router;
