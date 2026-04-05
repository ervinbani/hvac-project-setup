const Role = require('../models/Role');
const Permission = require('../models/Permission');

// GET /api/roles
const listRoles = async (req, res, next) => {
  try {
    const roles = await Role.find({ tenantId: req.user.tenantId, isActive: true })
      .populate('permissions', 'key entity action description')
      .sort({ name: 1 })
      .lean();

    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
};

// GET /api/roles/:id
const getRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, tenantId: req.user.tenantId })
      .populate('permissions', 'key entity action description')
      .lean();

    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    res.json({ success: true, data: role });
  } catch (err) {
    next(err);
  }
};

// POST /api/roles
const createRole = async (req, res, next) => {
  try {
    const { name, code, description, permissionIds } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'name and code are required' });
    }

    const existing = await Role.findOne({ tenantId: req.user.tenantId, code: code.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Role code already exists for this tenant' });
    }

    // Validate permission IDs if provided
    let permissions = [];
    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      const found = await Permission.find({ _id: { $in: permissionIds }, isActive: true }).lean();
      permissions = found.map((p) => p._id);
    }

    const role = await Role.create({
      tenantId: req.user.tenantId,
      name,
      code: code.toLowerCase(),
      description: description || '',
      permissions,
    });

    const populated = await role.populate('permissions', 'key entity action description');
    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// PUT /api/roles/:id
const updateRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    if (role.isSystemRole) {
      // Owners can modify any system role except their own (prevents accidental lockout)
      if (req.user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'System roles cannot be modified' });
      }
      if (role.code === 'owner') {
        return res.status(403).json({ success: false, error: 'The owner role cannot be modified' });
      }
    }

    const { name, description, permissionIds } = req.body;

    if (name !== undefined) role.name = name;
    if (description !== undefined) role.description = description;

    if (Array.isArray(permissionIds)) {
      const found = await Permission.find({ _id: { $in: permissionIds }, isActive: true }).lean();
      role.permissions = found.map((p) => p._id);
    }

    await role.save();
    const populated = await role.populate('permissions', 'key entity action description');
    res.json({ success: true, data: populated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/roles/:id
const deleteRole = async (req, res, next) => {
  try {
    const role = await Role.findOne({ _id: req.params.id, tenantId: req.user.tenantId });

    if (!role) {
      return res.status(404).json({ success: false, error: 'Role not found' });
    }

    if (role.isSystemRole) {
      if (req.user.role !== 'owner') {
        return res.status(403).json({ success: false, error: 'System roles cannot be deleted' });
      }
      if (role.code === 'owner') {
        return res.status(403).json({ success: false, error: 'The owner role cannot be deleted' });
      }
    }

    role.isActive = false;
    await role.save();

    res.json({ success: true, data: { message: 'Role deactivated' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listRoles, getRole, createRole, updateRole, deleteRole };
