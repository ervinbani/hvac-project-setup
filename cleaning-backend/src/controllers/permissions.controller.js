const Permission = require('../models/Permission');

// GET /api/permissions
const listPermissions = async (req, res, next) => {
  try {
    const permissions = await Permission.find({ isActive: true })
      .sort({ entity: 1, action: 1 })
      .lean();

    res.json({ success: true, data: permissions });
  } catch (err) {
    next(err);
  }
};

module.exports = { listPermissions };
