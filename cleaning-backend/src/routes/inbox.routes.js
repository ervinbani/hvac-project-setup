const express = require('express');
const router = express.Router();
const {
  listInbox,
  listSent,
  getThread,
  sendInternalMessage,
  markAsRead,
  unreadCount,
  deleteMessage,
} = require('../controllers/inbox.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/',                    listInbox);
router.get('/sent',                listSent);
router.get('/unread-count',        unreadCount);
router.get('/thread/:userId',      getThread);
router.post('/send',               sendInternalMessage);
router.patch('/:id/read',          markAsRead);
router.delete('/:id',              deleteMessage);

module.exports = router;
