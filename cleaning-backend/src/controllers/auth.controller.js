const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const User = require('../models/User');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

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

    if (!tenantName || !slug || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Check if slug is already taken
    const existingTenant = await Tenant.findOne({ slug: slug.toLowerCase() });
    if (existingTenant) {
      return res.status(409).json({ success: false, error: 'Tenant slug already taken' });
    }

    // Create tenant
    const tenant = await Tenant.create({
      name: tenantName,
      slug: slug.toLowerCase(),
      contactEmail: contactEmail || email,
      contactPhone,
      timezone,
    });

    // Check if email is already in use within tenant (shouldn't happen for first user)
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      tenantId: tenant._id,
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      role: 'owner',
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        tenant: {
          id: tenant._id,
          name: tenant.name,
          slug: tenant.slug,
        },
      },
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
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Find tenant if slug provided, else find user by email across all tenants
    let tenantFilter = {};
    if (slug) {
      const tenant = await Tenant.findOne({ slug: slug.toLowerCase() });
      if (!tenant) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }
      tenantFilter = { tenantId: tenant._id };
    }

    const user = await User.findOne({ email: email.toLowerCase(), isActive: true, ...tenantFilter });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
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
    const user = await User.findById(req.user.id).select('-passwordHash -__v');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // MED-5: return only fields the client needs
    res.json({
      success: true,
      data: {
        id:                user._id,
        firstName:         user.firstName,
        lastName:          user.lastName,
        email:             user.email,
        role:              user.role,
        preferredLanguage: user.preferredLanguage,
        phone:             user.phone,
        tenantId:          user.tenantId,
        isActive:          user.isActive,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
