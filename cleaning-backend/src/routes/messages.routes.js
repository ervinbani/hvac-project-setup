const express = require('express');
const router = express.Router();
const { listMessages, sendMessage } = require('../controllers/messages.controller');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.use(auth);

router.get('/', listMessages);
router.post('/send', requireRole('owner', 'manager', 'staff'), sendMessage);

module.exports = router;
