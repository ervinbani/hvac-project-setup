const MessageLog = require('../models/MessageLog');

// GET /api/messages
const listMessages = async (req, res, next) => {
  try {
    const VALID_CHANNELS = ['sms', 'email', 'whatsapp'];
    const VALID_STATUSES = ['queued', 'sent', 'delivered', 'failed', 'opened'];
    const MAX_LIMIT      = 100;

    const rawCustomerId = typeof req.query.customerId === 'string' ? req.query.customerId : undefined;
    const rawJobId      = typeof req.query.jobId === 'string' ? req.query.jobId : undefined;
    const rawChannel    = typeof req.query.channel === 'string' ? req.query.channel : undefined;
    const rawStatus     = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page          = Math.max(1, parseInt(req.query.page) || 1);
    const limit         = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit) || 20));

    const filter = { tenantId: req.user.tenantId };
    if (rawCustomerId) filter.customerId = String(rawCustomerId);
    if (rawJobId)      filter.jobId      = String(rawJobId);
    if (rawChannel && VALID_CHANNELS.includes(rawChannel)) filter.channel = rawChannel;
    if (rawStatus  && VALID_STATUSES.includes(rawStatus))  filter.status  = rawStatus;

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      MessageLog.find(filter)
        .populate('customerId', 'firstName lastName email phone')
        .populate('jobId', 'title scheduledStart')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MessageLog.countDocuments(filter),
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

// Local mock transport — logs to console and immediately marks as delivered
const localTransport = (message) => {
  const border = '─'.repeat(50);
  console.log(`\n📨 [LOCAL MESSAGE]`);
  console.log(border);
  console.log(`  Channel  : ${message.channel.toUpperCase()}`);
  console.log(`  To       : customer ${message.customerId || 'N/A'}`);
  console.log(`  Language : ${message.language || 'en'}`);
  if (message.subject) console.log(`  Subject  : ${message.subject}`);
  if (message.body)    console.log(`  Body     : ${message.body}`);
  if (message.templateKey) console.log(`  Template : ${message.templateKey}`);
  console.log(border + '\n');
  return 'delivered';
};

// POST /api/messages/send
const sendMessage = async (req, res, next) => {
  try {
    const {
      customerId,
      jobId,
      channel,
      direction = 'outbound',
      language,
      templateKey,
      subject,
      body,
    } = req.body;

    if (!channel) {
      return res.status(400).json({ success: false, error: 'channel is required' });
    }

    const message = await MessageLog.create({
      tenantId: req.user.tenantId,
      customerId,
      jobId,
      channel,
      direction,
      language,
      templateKey,
      subject,
      body,
      provider:          'local',
      providerMessageId: `local-${Date.now()}`,
      status:            'queued',
    });

    // Use local transport in dev/test, real provider otherwise
    if (!process.env.MESSAGE_PROVIDER || process.env.MESSAGE_PROVIDER === 'local') {
      const deliveredStatus = localTransport(message);
      message.status = deliveredStatus;
      await message.save();
    }
    // Future: else if (process.env.MESSAGE_PROVIDER === 'twilio') { ... }
    // Future: else if (process.env.MESSAGE_PROVIDER === 'sendgrid') { ... }

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/messages/:id — cancella un log messaggio (solo admin/staff)
const deleteMessageLog = async (req, res, next) => {
  try {
    const message = await MessageLog.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
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

module.exports = { listMessages, sendMessage, deleteMessageLog };
