const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getInbox,
  getSent,
  getUnreadCount,
  getThread,
  sendMessage,
  markAsRead,
  deleteMessage,
} = require('../controllers/inbox.controller');

router.use(auth);

router.get('/',                  getInbox);
router.get('/sent',              getSent);
router.get('/unread-count',      getUnreadCount);
router.get('/thread/:userId',    getThread);
router.post('/send',             sendMessage);
router.patch('/:id/read',        markAsRead);
router.delete('/:id',            deleteMessage);

module.exports = router;
