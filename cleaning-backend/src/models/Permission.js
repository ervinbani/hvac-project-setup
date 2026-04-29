const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    entity: {
      type: String,
      required: true,
      enum: ['users', 'jobs', 'services', 'invoices', 'roles', 'permissions', 'documents'],
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'read', 'update', 'delete'],
    },
    description: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

PermissionSchema.index({ entity: 1, action: 1 }, { unique: true });

module.exports = mongoose.model('Permission', PermissionSchema);
