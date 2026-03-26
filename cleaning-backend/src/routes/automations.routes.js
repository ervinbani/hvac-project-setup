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

router.use(auth);

router.get('/', listAutomations);
router.post('/', requireRole('owner', 'manager'), createAutomation);
router.put('/:id', requireRole('owner', 'manager'), updateAutomation);
router.delete('/:id', requireRole('owner', 'manager'), deleteAutomation);

module.exports = router;
