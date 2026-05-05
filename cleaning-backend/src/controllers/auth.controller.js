const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Tenant = require("../models/Tenant");
const User = require("../models/User");
const Permission = require("../models/Permission");
const Role = require("../models/Role");
const {
  sendWelcomeEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
} = require("../services/email.service");

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      tenantId: user.tenantId,
      role: user.role,
      roleId: user.roleId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

const PERMISSIONS_SEED = [
  { key: "users.create", entity: "users", action: "create" },
  { key: "users.read", entity: "users", action: "read" },
  { key: "users.update", entity: "users", action: "update" },
  { key: "users.delete", entity: "users", action: "delete" },
  { key: "jobs.create", entity: "jobs", action: "create" },
  { key: "jobs.read", entity: "jobs", action: "read" },
  { key: "jobs.update", entity: "jobs", action: "update" },
  { key: "jobs.delete", entity: "jobs", action: "delete" },
  { key: "services.create", entity: "services", action: "create" },
  { key: "services.read", entity: "services", action: "read" },
  { key: "services.update", entity: "services", action: "update" },
  { key: "services.delete", entity: "services", action: "delete" },
  { key: "invoices.create", entity: "invoices", action: "create" },
  { key: "invoices.read", entity: "invoices", action: "read" },
  { key: "invoices.update", entity: "invoices", action: "update" },
  { key: "invoices.delete", entity: "invoices", action: "delete" },
  { key: "roles.create", entity: "roles", action: "create" },
  { key: "roles.read", entity: "roles", action: "read" },
  { key: "roles.update", entity: "roles", action: "update" },
  { key: "roles.delete", entity: "roles", action: "delete" },
  { key: "permissions.read", entity: "permissions", action: "read" },
  { key: "permissions.update", entity: "permissions", action: "update" },
];

/**
 * Ensures global permissions exist, then creates the 6 default roles for a tenant.
 * Returns the owner Role document.
 */
async function createDefaultRoles(tenantId) {
  // Upsert global permissions
  await Promise.all(
    PERMISSIONS_SEED.map((p) =>
      Permission.findOneAndUpdate({ key: p.key }, p, {
        upsert: true,
        new: true,
      }),
    ),
  );

  // Fetch all permission docs by key for easy lookup
  const allPerms = await Permission.find({}).lean();
  const byKey = {};
  allPerms.forEach((p) => {
    byKey[p.key] = p._id;
  });

  const pids = (keys) => keys.map((k) => byKey[k]).filter(Boolean);

  const roleDefs = [
    {
      name: "Owner",
      code: "owner",
      isSystemRole: true,
      isActive: true,
      permissions: pids(Object.keys(byKey)), // all
    },
    {
      name: "Director",
      code: "director",
      isSystemRole: true,
      isActive: true,
      permissions: pids([
        "users.read",
        "users.update",
        "jobs.create",
        "jobs.read",
        "jobs.update",
        "jobs.delete",
        "services.create",
        "services.read",
        "services.update",
        "invoices.read",
        "invoices.update",
        "roles.read",
        "permissions.read",
      ]),
    },
    {
      name: "Operations Manager",
      code: "manager_operations",
      isSystemRole: true,
      isActive: true,
      permissions: pids([
        "jobs.create",
        "jobs.read",
        "jobs.update",
        "jobs.delete",
        "services.read",
        "users.read",
        "invoices.read",
      ]),
    },
    {
      name: "HR Manager",
      code: "manager_hr",
      isSystemRole: true,
      isActive: true,
      permissions: pids([
        "users.create",
        "users.read",
        "users.update",
        "users.delete",
      ]),
    },
    {
      name: "Staff",
      code: "staff",
      isSystemRole: true,
      isActive: true,
      permissions: pids(["jobs.read", "services.read", "invoices.read"]),
    },
    {
      name: "Worker",
      code: "worker",
      isSystemRole: true,
      isActive: true,
      permissions: pids(["jobs.read"]),
    },
  ];

  let ownerRole = null;
  for (const def of roleDefs) {
    const role = await Role.findOneAndUpdate(
      { tenantId, code: def.code },
      { ...def, tenantId },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    if (def.code === "owner") ownerRole = role;
  }

  return ownerRole;
}

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      tenantName,
      slug,
      firstName,
      lastName,
      email,
      password,
      contactEmail,
      contactPhone,
      timezone,
    } = req.body;

    if (
      !tenantName ||
      !slug ||
      !firstName ||
      !lastName ||
      !email ||
      !password
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Check if slug is already taken
    const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingTenant) {
      return res
        .status(409)
        .json({ success: false, error: "Tenant slug already taken" });
    }

    // Create tenant
    const tenant = await Tenant.create({
      name: tenantName,
      slug: slug.toLowerCase(),
      contactEmail: contactEmail || email,
      contactPhone,
      timezone,
    });

    // Create default roles for new tenant and get owner role
    const ownerRole = await createDefaultRoles(tenant._id);

    const passwordHash = await bcrypt.hash(password, 12);

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await User.create({
      tenantId: tenant._id,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role: "owner",
      roleId: ownerRole._id,
      isActive: false,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Send verification email (non-blocking)
    sendVerificationEmail({
      to: user.email,
      firstName: user.firstName,
      verificationToken,
    }).catch((err) =>
      console.error("[email] verification email failed:", err.message),
    );

    res.status(201).json({
      success: true,
      data: {
        message:
          "Registration successful. Please check your email to verify your account before logging in.",
        email: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/verify-email?token=...
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res
        .status(400)
        .json({ success: false, error: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).populate("tenantId");

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification token",
      });
    }

    user.isActive = true;
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send welcome email now that the account is activated
    const tenantName = user.tenantId?.name || "";
    sendWelcomeEmail({
      to: user.email,
      firstName: user.firstName,
      tenantName,
    }).catch((err) =>
      console.error("[email] welcome email failed:", err.message),
    );

    res.json({
      success: true,
      data: { message: "Email verified successfully. You can now log in." },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password, slug } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Email and password are required" });
    }

    // Find tenant if slug provided, else find user by email across all tenants
    let tenantFilter = {};
    if (slug) {
      const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
      if (!tenant) {
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      }
      tenantFilter = { tenantId: tenant._id };
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      ...tenantFilter,
    });
    if (!user || !user.isActive) {
      // Give a more specific error if the account exists but email is unverified
      if (user && !user.emailVerified) {
        return res.status(403).json({
          success: false,
          error: "Please verify your email address before logging in.",
          code: "EMAIL_NOT_VERIFIED",
        });
      }
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          roleId: user.roleId,
          tenantId: user.tenantId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash -__v");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // MED-5: return only fields the client needs
    res.json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        preferredLanguage: user.preferredLanguage,
        phone: user.phone,
        tenantId: user.tenantId,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/me
const updateMe = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, preferredLanguage } = req.body;

    const updates = {};
    if (firstName !== undefined) updates.firstName = firstName.trim();
    if (lastName !== undefined) updates.lastName = lastName.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (preferredLanguage !== undefined)
      updates.preferredLanguage = preferredLanguage;

    if (email !== undefined) {
      const normalised = email.toLowerCase().trim();
      const conflict = await User.findOne({
        tenantId: req.user.tenantId,
        email: normalised,
        _id: { $ne: req.user.id },
      });
      if (conflict) {
        return res
          .status(409)
          .json({ success: false, error: "Email already in use" });
      }
      updates.email = normalised;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true },
    ).select("-passwordHash -__v");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        roleId: user.roleId,
        preferredLanguage: user.preferredLanguage,
        phone: user.phone,
        tenantId: user.tenantId,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  verifyEmail,
  login,
  me,
  updateMe,
  forgotPassword,
  resetPassword,
};

// POST /api/auth/forgot-password
// Risponde sempre 200 per evitare user enumeration
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, error: "Email is required" });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    // Se l'utente esiste, genera token e manda email
    if (user) {
      // Token raw (mandato nell'email)
      const rawToken = crypto.randomBytes(32).toString("hex");
      // Hash del token (salvato nel DB)
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 ora
      await user.save();

      sendResetPasswordEmail({
        to: user.email,
        firstName: user.firstName,
        resetToken: rawToken,
      }).catch((err) =>
        console.error("[email] reset email failed:", err.message),
      );
    }

    // Risposta identica sia che l'utente esista o no
    res.json({
      success: true,
      data: { message: "If that email exists, a reset link has been sent." },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Token and new password are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters",
      });
    }

    // Hash del token ricevuto per confrontarlo con quello nel DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }, // non scaduto
      isActive: true,
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, error: "Token is invalid or has expired" });
    }

    // Aggiorna password e invalida il token
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({
      success: true,
      data: { message: "Password updated successfully" },
    });
  } catch (err) {
    next(err);
  }
}
