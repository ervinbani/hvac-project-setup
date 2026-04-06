/**
 * Migration: ensure all tenants have the 6 default system roles with isActive: true
 *
 * Safe to run multiple times (uses upsert).
 *
 * Usage:
 *   node scripts/migrate-roles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Tenant = require('../src/models/Tenant');
const Permission = require('../src/models/Permission');
const Role = require('../src/models/Role');

const PERMISSIONS_SEED = [
  { key: 'users.create',       entity: 'users',       action: 'create' },
  { key: 'users.read',         entity: 'users',       action: 'read'   },
  { key: 'users.update',       entity: 'users',       action: 'update' },
  { key: 'users.delete',       entity: 'users',       action: 'delete' },
  { key: 'jobs.create',        entity: 'jobs',        action: 'create' },
  { key: 'jobs.read',          entity: 'jobs',        action: 'read'   },
  { key: 'jobs.update',        entity: 'jobs',        action: 'update' },
  { key: 'jobs.delete',        entity: 'jobs',        action: 'delete' },
  { key: 'services.create',    entity: 'services',    action: 'create' },
  { key: 'services.read',      entity: 'services',    action: 'read'   },
  { key: 'services.update',    entity: 'services',    action: 'update' },
  { key: 'services.delete',    entity: 'services',    action: 'delete' },
  { key: 'invoices.create',    entity: 'invoices',    action: 'create' },
  { key: 'invoices.read',      entity: 'invoices',    action: 'read'   },
  { key: 'invoices.update',    entity: 'invoices',    action: 'update' },
  { key: 'invoices.delete',    entity: 'invoices',    action: 'delete' },
  { key: 'roles.create',       entity: 'roles',       action: 'create' },
  { key: 'roles.read',         entity: 'roles',       action: 'read'   },
  { key: 'roles.update',       entity: 'roles',       action: 'update' },
  { key: 'roles.delete',       entity: 'roles',       action: 'delete' },
  { key: 'permissions.read',   entity: 'permissions', action: 'read'   },
  { key: 'permissions.update', entity: 'permissions', action: 'update' },
];

async function ensureDefaultRoles(tenantId) {
  // Upsert global permissions
  await Promise.all(
    PERMISSIONS_SEED.map((p) =>
      Permission.findOneAndUpdate({ key: p.key }, p, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      })
    )
  );

  const allPerms = await Permission.find({}).lean();
  const byKey = {};
  allPerms.forEach((p) => { byKey[p.key] = p._id; });
  const pids = (keys) => keys.map((k) => byKey[k]).filter(Boolean);

  const roleDefs = [
    {
      name: 'Owner',              code: 'owner',              isSystemRole: true, isActive: true,
      permissions: pids(Object.keys(byKey)),
    },
    {
      name: 'Director',           code: 'director',           isSystemRole: true, isActive: true,
      permissions: pids([
        'users.read', 'users.update',
        'jobs.create', 'jobs.read', 'jobs.update', 'jobs.delete',
        'services.create', 'services.read', 'services.update',
        'invoices.read', 'invoices.update',
        'roles.read', 'permissions.read',
      ]),
    },
    {
      name: 'Operations Manager', code: 'manager_operations', isSystemRole: true, isActive: true,
      permissions: pids([
        'jobs.create', 'jobs.read', 'jobs.update', 'jobs.delete',
        'services.read', 'users.read', 'invoices.read',
      ]),
    },
    {
      name: 'HR Manager',         code: 'manager_hr',         isSystemRole: true, isActive: true,
      permissions: pids(['users.create', 'users.read', 'users.update', 'users.delete']),
    },
    {
      name: 'Staff',              code: 'staff',              isSystemRole: true, isActive: true,
      permissions: pids(['jobs.read', 'services.read', 'invoices.read']),
    },
    {
      name: 'Worker',             code: 'worker',             isSystemRole: true, isActive: true,
      permissions: pids(['jobs.read']),
    },
  ];

  let created = 0;
  let updated = 0;

  for (const def of roleDefs) {
    const existing = await Role.findOne({ tenantId, code: def.code });
    await Role.findOneAndUpdate(
      { tenantId, code: def.code },
      { ...def, tenantId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (existing) updated++;
    else created++;
  }

  return { created, updated };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB\n');

  const tenants = await Tenant.find({}).lean();
  console.log(`📋  Found ${tenants.length} tenant(s)\n`);

  for (const tenant of tenants) {
    process.stdout.write(`   → ${tenant.name} (${tenant._id}) ... `);
    const { created, updated } = await ensureDefaultRoles(tenant._id);
    console.log(`${created} created, ${updated} updated`);
  }

  console.log('\n✅  Migration complete');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
