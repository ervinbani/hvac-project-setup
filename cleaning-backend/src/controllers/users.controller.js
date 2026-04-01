const bcrypt = require("bcryptjs");
const User = require("../models/User");

// GET /api/users
const listUsers = async (req, res, next) => {
  try {
    const VALID_ROLES = ["owner", "manager", "cleaner", "staff"];
    const ROLE_HIERARCHY = { owner: 4, manager: 3, staff: 2, cleaner: 1 };
    const MAX_LIMIT = 100;

    const rawRole =
      typeof req.query.role === "string" ? req.query.role : undefined;
    const rawIsActive =
      typeof req.query.isActive === "string" ? req.query.isActive : undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(req.query.limit) || 50),
    );

    const myRank = ROLE_HIERARCHY[req.user.role];
    const visibleRoles = Object.entries(ROLE_HIERARCHY)
      .filter(([, rank]) => rank <= myRank)
      .map(([role]) => role);

    const filter = { tenantId: req.user.tenantId, role: { $in: visibleRoles } };
    // Allow further filtering by role only if it's within visible roles
    if (rawRole && VALID_ROLES.includes(rawRole) && visibleRoles.includes(rawRole)) {
      filter.role = rawRole;
    }
    if (rawIsActive !== undefined) filter.isActive = rawIsActive === "true";

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { total, page, limit },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/users
const createUser = async (req, res, next) => {
  try {
    const VALID_ROLES = ["owner", "manager", "cleaner", "staff"];
    const ROLE_HIERARCHY = { owner: 4, manager: 3, staff: 2, cleaner: 1 };

    const {
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      preferredLanguage,
    } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res
        .status(400)
        .json({
          success: false,
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
        });
    }

    // Prevent creating a user with equal or higher role than yourself (only owner can create owner)
    if (
      ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[req.user.role] &&
      req.user.role !== "owner"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          error:
            "You cannot create a user with a role equal to or higher than your own",
        });
    }

    const existing = await User.findOne({
      tenantId: req.user.tenantId,
      email: email.toLowerCase(),
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      tenantId: req.user.tenantId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role,
      phone,
      preferredLanguage,
    });

    const { passwordHash: _, ...userData } = user.toObject();

    res.status(201).json({ success: true, data: userData });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const VALID_ROLES = ["owner", "manager", "cleaner", "staff"];
    const ROLE_HIERARCHY = { owner: 4, manager: 3, staff: 2, cleaner: 1 };

    const allowedFields = [
      "firstName",
      "lastName",
      "role",
      "phone",
      "preferredLanguage",
    ];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validate and guard role changes
    if (updates.role) {
      if (!VALID_ROLES.includes(updates.role)) {
        return res
          .status(400)
          .json({
            success: false,
            error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
          });
      }
      // Non-owners cannot elevate a user to a role >= their own
      if (
        ROLE_HIERARCHY[updates.role] >= ROLE_HIERARCHY[req.user.role] &&
        req.user.role !== "owner"
      ) {
        return res
          .status(403)
          .json({
            success: false,
            error: "You cannot assign a role equal to or higher than your own",
          });
      }
    }

    // Allow password update
    if (req.body.password) {
      updates.passwordHash = await bcrypt.hash(req.body.password, 12);
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/users/:id  (soft delete)
const deleteUser = async (req, res, next) => {
  try {
    // Prevent owner from deactivating themselves
    if (req.params.id === req.user.id) {
      return res
        .status(400)
        .json({ success: false, error: "Cannot deactivate your own account" });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.user.tenantId },
      { $set: { isActive: false } },
      { new: true },
    ).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: { message: "User deactivated", user } });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const ROLE_HIERARCHY = { owner: 4, manager: 3, staff: 2, cleaner: 1 };

    const user = await User.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId,
    }).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    if (ROLE_HIERARCHY[user.role] > ROLE_HIERARCHY[req.user.role]) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser };
