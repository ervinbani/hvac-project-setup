const User = require('../models/User');
const Role = require('../models/Role');

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

      if (user?.roleId?.permissions) {
        // Normal path: user has a valid roleId
        req.user.permissions = user.roleId.permissions;
      } else {
        // Fallback: user was created before roleId was set — resolve by role code + tenantId
        const role = await Role.findOne({
          tenantId: req.user.tenantId,
          code: req.user.role,
        })
          .populate('permissions')
          .lean();
        req.user.permissions = role?.permissions || [];
      }
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
