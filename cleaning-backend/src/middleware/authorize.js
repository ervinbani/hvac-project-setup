const User = require('../models/User');

/**
 * Permission-based middleware.
 * Usage: authorize('jobs.create')
 *
 * Owner role always bypasses the check.
 * Permissions are lazy-loaded from DB and cached on req.user for the request lifetime.
 */
const authorize = (permissionKey) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Owner bypass — full access
    if (req.user.role === 'owner') {
      return next();
    }

    // Lazy-load permissions once per request
    if (!req.user.permissions) {
      const user = await User.findById(req.user.id)
        .populate({ path: 'roleId', populate: { path: 'permissions' } })
        .lean();

      req.user.permissions = user?.roleId?.permissions || [];
    }

    const allowed = req.user.permissions.some((p) => p.key === permissionKey);
    if (!allowed) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = authorize;
