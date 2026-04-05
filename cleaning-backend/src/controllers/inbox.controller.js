const InternalMessage = require("../models/InternalMessage");
const User = require("../models/User");

// GET /api/inbox — messaggi ricevuti dall'utente loggato
const listInbox = async (req, res, next) => {
  try {
    const MAX_LIMIT = 100;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 20),
    );
    const skip = (page - 1) * limit;

    const filter = {
      tenantId: req.user.tenantId,
      toUserId: req.user.id,
    };

    // Opzionale: filtra solo non letti
    if (req.query.unread === "true") filter.isRead = false;

    const [messages, total] = await Promise.all([
      InternalMessage.find(filter)
        .populate("fromUserId", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InternalMessage.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/inbox/thread/:userId — conversazione con un utente specifico
const getThread = async (req, res, next) => {
  try {
    const MAX_LIMIT = 100;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 20),
    );
    const skip = (page - 1) * limit;

    const otherUserId = req.params.userId;

    const filter = {
      tenantId: req.user.tenantId,
      $or: [
        { fromUserId: req.user.id, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: req.user.id },
      ],
    };

    const [messages, total] = await Promise.all([
      InternalMessage.find(filter)
        .populate("fromUserId", "firstName lastName role")
        .populate("toUserId", "firstName lastName role")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InternalMessage.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/inbox/sent — messaggi inviati dall'utente loggato
const listSent = async (req, res, next) => {
  try {
    const MAX_LIMIT = 100;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 20),
    );
    const skip = (page - 1) * limit;

    const filter = {
      tenantId: req.user.tenantId,
      fromUserId: req.user.id,
    };

    const [messages, total] = await Promise.all([
      InternalMessage.find(filter)
        .populate('fromUserId', 'firstName lastName email role')
        .populate('toUserId', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InternalMessage.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: messages,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/inbox/send — invia messaggio a un altro utente
const sendInternalMessage = async (req, res, next) => {
  try {
    const { toUserId, body, subject } = req.body;

    if (!toUserId || !body) {
      return res
        .status(400)
        .json({ success: false, error: "toUserId and body are required" });
    }

    if (toUserId === String(req.user.id)) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot send a message to yourself" });
    }

    // Verifica che il destinatario esista nello stesso tenant
    const recipient = await User.findOne({
      _id: toUserId,
      tenantId: req.user.tenantId,
      isActive: true,
    }).lean();

    if (!recipient) {
      return res
        .status(404)
        .json({ success: false, error: "Recipient not found" });
    }

    const message = await InternalMessage.create({
      tenantId: req.user.tenantId,
      fromUserId: req.user.id,
      toUserId,
      body: body.trim(),
      subject: subject ? subject.trim() : null,
    });

    const populated = await message.populate(
      "fromUserId",
      "firstName lastName role",
    );

    // Log to console in local/dev environment
    if (
      !process.env.MESSAGE_PROVIDER ||
      process.env.MESSAGE_PROVIDER === "local"
    ) {
      console.log(`\n💬 [INTERNAL MESSAGE]`);
      console.log(
        `  From : ${populated.fromUserId.firstName} ${populated.fromUserId.lastName}`,
      );
      console.log(`  To   : ${recipient.firstName} ${recipient.lastName}`);
      console.log(`  Body : ${body.trim()}\n`);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/inbox/:id/read — segna messaggio come letto
const markAsRead = async (req, res, next) => {
  try {
    const message = await InternalMessage.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      toUserId: req.user.id,
    });

    if (!message) {
      return res
        .status(404)
        .json({ success: false, error: "Message not found" });
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    await message.populate("fromUserId", "firstName lastName role");
    await message.populate("toUserId", "firstName lastName role");
    res.json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};

// GET /api/inbox/unread-count — contatore messaggi non letti
const unreadCount = async (req, res, next) => {
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

// DELETE /api/inbox/:id — cancella un messaggio (solo mittente o destinatario)
const deleteMessage = async (req, res, next) => {
  try {
    const message = await InternalMessage.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
      $or: [
        { fromUserId: req.user.id },
        { toUserId: req.user.id },
      ],
    });

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    await message.deleteOne();
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listInbox,
  listSent,
  getThread,
  sendInternalMessage,
  markAsRead,
  unreadCount,
  deleteMessage,
};
