const express = require('express');
const router = express.Router();
const { getTenant, updateTenant } = require('../controllers/tenant.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

router.get('/', getTenant);
router.put('/', requireRole('owner', 'manager'), updateTenant);

module.exports = router;
