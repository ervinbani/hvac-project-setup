const InternalMessage = require('../models/InternalMessage');
const mongoose = require('mongoose');

const POPULATE = [
  { path: 'fromUserId', select: 'firstName lastName email role' },
  { path: 'toUserId',   select: 'firstName lastName email role' },
];

// GET /api/inbox — messages received by me
const getInbox = async (req, res, next) => {
  try {
    const messages = await InternalMessage.find({
      tenantId: req.user.tenantId,
      toUserId: req.user.id,
    })
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

// GET /api/inbox/sent — messages sent by me
const getSent = async (req, res, next) => {
  try {
    const messages = await InternalMessage.find({
      tenantId: req.user.tenantId,
      fromUserId: req.user.id,
    })
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

// GET /api/inbox/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await InternalMessage.countDocuments({
      tenantId: req.user.tenantId,
      toUserId: req.user.id,
      isRead: false,
    });

    res.json({ success: true, data: { count } });
  } catch (err) {
    next(err);
  }
};

// GET /api/inbox/thread/:userId — all messages between me and userId
const getThread = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid userId' });
    }

    const myId = req.user.id;
    const messages = await InternalMessage.find({
      tenantId: req.user.tenantId,
      $or: [
        { fromUserId: myId, toUserId: userId },
        { fromUserId: userId, toUserId: myId },
      ],
    })
      .populate(POPULATE)
      .sort({ createdAt: 1 });

    res.json({ success: true, data: messages });
  } catch (err) {
    next(err);
  }
};

// POST /api/inbox/send
const sendMessage = async (req, res, next) => {
  try {
    const { toUserId, body, subject } = req.body;

    if (!toUserId || !mongoose.Types.ObjectId.isValid(toUserId)) {
      return res.status(400).json({ success: false, error: 'Valid toUserId is required' });
    }
    if (!body || typeof body !== 'string' || !body.trim()) {
      return res.status(400).json({ success: false, error: 'body is required' });
    }

    const message = await InternalMessage.create({
      tenantId:   req.user.tenantId,
      fromUserId: req.user.id,
      toUserId,
      body:       body.trim().slice(0, 2000),
      subject:    subject ? String(subject).trim().slice(0, 255) : null,
    });

    const populated = await message.populate(POPULATE);
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/inbox/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const msg = await InternalMessage.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      toUserId: req.user.id, // only recipient can mark as read
    });

    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    if (!msg.isRead) {
      msg.isRead = true;
      msg.readAt = new Date();
      await msg.save();
    }

    await msg.populate(POPULATE);
    res.json({ success: true, data: msg });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/inbox/:id
const deleteMessage = async (req, res, next) => {
  try {
    const msg = await InternalMessage.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      $or: [{ fromUserId: req.user.id }, { toUserId: req.user.id }],
    });

    if (!msg) return res.status(404).json({ success: false, error: 'Message not found' });

    await msg.deleteOne();
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
};

module.exports = { getInbox, getSent, getUnreadCount, getThread, sendMessage, markAsRead, deleteMessage };
