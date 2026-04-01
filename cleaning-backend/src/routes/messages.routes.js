const express = require('express');
const router = express.Router();
const { listMessages, sendMessage } = require('../controllers/messages.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const ADMIN_STAFF = ['owner', 'director', 'manager_operations', 'manager_hr', 'staff'];

router.use(auth);

router.get('/', listMessages);
router.post('/send', requireRole(...ADMIN_STAFF), sendMessage);

module.exports = router;
