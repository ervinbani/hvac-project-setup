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
      provider,
      providerMessageId,
      status,
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
      provider,
      providerMessageId,
      status: status || 'queued',
    });

    // Future: integrate with Twilio, SendGrid, etc.

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};

module.exports = { listMessages, sendMessage };
