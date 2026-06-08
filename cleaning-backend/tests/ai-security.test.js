process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { connect, disconnect, clearCollections } = require('./setup');
const { buildTools } = require('../src/ai/tools');

const Customer = require('../src/models/Customer');
const Job = require('../src/models/Job');
const Invoice = require('../src/models/Invoice');
const Service = require('../src/models/Service');
const User = require('../src/models/User');

// Use string IDs to match production (JWT decode yields strings, not ObjectIds)
const TENANT_A_ID = new mongoose.Types.ObjectId().toString();
const TENANT_B_ID = new mongoose.Types.ObjectId().toString();
const USER_A_ID = new mongoose.Types.ObjectId().toString();

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearCollections(); });

async function seedData() {
  const customerA = await Customer.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_A_ID,
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario@rossi.com',
    phone: '111-1111',
    status: 'active',
  });

  const serviceA = await Service.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_A_ID,
    name: { en: 'Standard Cleaning', es: 'Limpieza Estándar' },
    basePrice: 100,
    durationMinutes: 60,
    isActive: true,
  });

  const jobA = await Job.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_A_ID,
    customerId: customerA._id,
    serviceId: serviceA._id,
    title: 'Office Cleaning - Mario',
    scheduledStart: new Date('2026-06-10T10:00:00Z'),
    status: 'scheduled',
  });

  const invoiceA = await Invoice.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_A_ID,
    customerId: customerA._id,
    invoiceNumber: 'INV-A-001',
    issuedDate: new Date(),
    dueDate: new Date('2026-07-10'),
    items: [{ description: 'Cleaning service', quantity: 1, unitPrice: 100, total: 100 }],
    subtotal: 100,
    taxRate: 0,
    tax: 0,
    total: 100,
    currency: 'EUR',
    status: 'draft',
  });

  await User.create({
    _id: USER_A_ID,
    tenantId: TENANT_A_ID,
    firstName: 'Alice',
    lastName: 'Admin',
    email: 'alice@tenantA.com',
    passwordHash: 'hash',
    role: 'owner',
    isActive: true,
  });

  const customerB = await Customer.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_B_ID,
    firstName: 'Luigi',
    lastName: 'Verdi',
    email: 'luigi@verdi.com',
    phone: '222-2222',
    status: 'active',
  });

  const serviceB = await Service.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_B_ID,
    name: { en: 'Deep Clean', es: 'Limpieza Profunda' },
    basePrice: 200,
    durationMinutes: 120,
    isActive: true,
  });

  const jobB = await Job.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_B_ID,
    customerId: customerB._id,
    serviceId: serviceB._id,
    title: 'Deep Clean - Luigi',
    scheduledStart: new Date('2026-06-11T14:00:00Z'),
    status: 'scheduled',
  });

  const invoiceB = await Invoice.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_B_ID,
    customerId: customerB._id,
    invoiceNumber: 'INV-B-001',
    issuedDate: new Date(),
    dueDate: new Date('2026-07-11'),
    items: [{ description: 'Deep clean', quantity: 1, unitPrice: 200, total: 200 }],
    subtotal: 200,
    taxRate: 22,
    tax: 44,
    total: 244,
    currency: 'EUR',
    status: 'draft',
  });

  await User.create({
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_B_ID,
    firstName: 'Bob',
    lastName: 'Worker',
    email: 'bob@tenantB.com',
    passwordHash: 'hash',
    role: 'worker',
    isActive: true,
  });

  return { customerA, serviceA, jobA, invoiceA, customerB, serviceB, jobB, invoiceB };
}

describe('Read tools — cross-tenant isolation', () => {
  let data;

  beforeEach(async () => {
    data = await seedData();
  });

  it('searchCustomers cannot see other tenant data', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.searchCustomers.execute({ search: 'Luigi' });
    expect(result).toEqual({ message: expect.stringMatching(/No customers found/i) });
  });

  it('searchCustomers sees only own tenant data', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.searchCustomers.execute({ search: 'Mario' });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe('Mario');
  });

  it('searchJobs cannot see other tenant data', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.searchJobs.execute({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Office Cleaning - Mario');
  });

  it('getInvoiceById returns not found for other tenant invoice', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.getInvoiceById.execute({ id: data.invoiceB._id.toString() });
    expect(result).toEqual({ message: expect.stringMatching(/not found/i) });
  });

  it('getInvoiceById finds own tenant invoice', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.getInvoiceById.execute({ id: data.invoiceA._id.toString() });
    expect(result._id.toString()).toBe(data.invoiceA._id.toString());
  });

  it('searchServices cannot see other tenant services', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.searchServices.execute({});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].name.en).toBe('Standard Cleaning');
  });

  it('searchServices by name cannot find other tenant service', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.searchServices.execute({ search: 'Deep Clean' });
    expect(result).toEqual({ message: expect.stringMatching(/No services found/i) });
  });

  it('listUsers cannot see other tenant users', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.listUsers.execute({});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('alice@tenantA.com');
  });
});

describe('Write tools — pre-confirm business validation', () => {
  let data;

  beforeEach(async () => {
    data = await seedData();
  });

  it('createJob rejects customerId from another tenant', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.createJob.execute({
      customerId: data.customerB._id.toString(),
      serviceId: data.serviceA._id.toString(),
      scheduledDate: new Date('2026-06-12T10:00:00Z').toISOString(),
    });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/not found/i);
  });

  it('createJob rejects serviceId from another tenant', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.createJob.execute({
      customerId: data.customerA._id.toString(),
      serviceId: data.serviceB._id.toString(),
      scheduledDate: new Date('2026-06-12T10:00:00Z').toISOString(),
    });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/not found/i);
  });

  it('createJob succeeds with own tenant data (returns pending)', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.createJob.execute({
      customerId: data.customerA._id.toString(),
      serviceId: data.serviceA._id.toString(),
      scheduledDate: new Date('2026-06-12T10:00:00Z').toISOString(),
    });
    expect(result).toHaveProperty('pending', true);
    expect(result).toHaveProperty('confirmationCode');
  });

  it('updateJobStatus rejects jobId from another tenant', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.updateJobStatus.execute({
      jobId: data.jobB._id.toString(),
      status: 'confirmed',
    });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/not found/i);
  });

  it('createInvoice rejects customerId from another tenant', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.createInvoice.execute({
      customerId: data.customerB._id.toString(),
      dueDate: new Date('2026-07-12').toISOString(),
      items: [{ description: 'Test', quantity: 1, unitPrice: 50 }],
    });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/not found/i);
  });
});

describe('confirmAction — cross-tenant JWT security', () => {
  let data;

  beforeEach(async () => {
    data = await seedData();
  });

  it('rejects a JWT created for a different tenant', async () => {
    const toolsA = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const pending = await toolsA.createCustomer.execute({
      firstName: 'Hijack',
      lastName: 'Attempt',
      email: 'hack@test.com',
    });
    expect(pending.pending).toBe(true);

    const toolsB = buildTools({ user: { tenantId: TENANT_B_ID, id: new mongoose.Types.ObjectId(), role: 'owner', businessType: 'cleaning' } });
    const result = await toolsB.confirmAction.execute({ confirmationCode: pending.confirmationCode });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/Invalid confirmation code for this account/i);
  });

  it('rejects expired JWT', async () => {
    const expiredToken = jwt.sign(
      {
        action: 'createCustomer',
        params: { tenantId: TENANT_A_ID.toString(), firstName: 'Test' },
        tenantId: TENANT_A_ID.toString(),
        exp: Math.floor(Date.now() / 1000) - 60,
      },
      process.env.JWT_SECRET,
    );

    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.confirmAction.execute({ confirmationCode: expiredToken });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/expired/i);
  });

  it('rejects an invalid JWT signature', async () => {
    const badToken = jwt.sign(
      { action: 'createCustomer', params: { tenantId: TENANT_A_ID.toString() }, tenantId: TENANT_A_ID.toString() },
      'wrong-secret',
      { expiresIn: '5m' },
    );

    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.confirmAction.execute({ confirmationCode: badToken });
    expect(result).toHaveProperty('error');
    expect(result.error).toMatch(/Invalid confirmation code/i);
  });

  it('executes successfully for own tenant with valid code', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const pending = await tools.createCustomer.execute({
      firstName: 'New',
      lastName: 'Customer',
      email: 'new@test.com',
    });
    expect(pending.pending).toBe(true);

    const result = await tools.confirmAction.execute({ confirmationCode: pending.confirmationCode });
    expect(result).toHaveProperty('success', true);
    expect(result.data.firstName).toBe('New');

    const dbCustomer = await Customer.findOne({ email: 'new@test.com' }).lean();
    expect(dbCustomer).not.toBeNull();
    expect(dbCustomer.tenantId.toString()).toBe(TENANT_A_ID.toString());
  });

  it('createJob confirmation writes to DB with correct tenantId', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const pending = await tools.createJob.execute({
      customerId: data.customerA._id.toString(),
      serviceId: data.serviceA._id.toString(),
      scheduledDate: new Date('2026-06-12T10:00:00Z').toISOString(),
    });
    expect(pending.pending).toBe(true);

    const result = await tools.confirmAction.execute({ confirmationCode: pending.confirmationCode });
    expect(result).toHaveProperty('success', true);

    const dbJob = await Job.findById(result.data._id).lean();
    expect(dbJob.tenantId.toString()).toBe(TENANT_A_ID.toString());
  });

  it('updateJobStatus confirmation updates with correct tenantId scope', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const pending = await tools.updateJobStatus.execute({
      jobId: data.jobA._id.toString(),
      status: 'completed',
    });
    expect(pending.pending).toBe(true);

    const result = await tools.confirmAction.execute({ confirmationCode: pending.confirmationCode });
    expect(result).toHaveProperty('success', true);
    expect(result.data.status).toBe('completed');
  });

  it('createInvoice confirmation writes to DB with correct tenantId', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const pending = await tools.createInvoice.execute({
      customerId: data.customerA._id.toString(),
      dueDate: new Date('2026-07-12').toISOString(),
      items: [{ description: 'Test', quantity: 1, unitPrice: 50 }],
    });
    expect(pending.pending).toBe(true);

    const result = await tools.confirmAction.execute({ confirmationCode: pending.confirmationCode });
    expect(result).toHaveProperty('success', true);

    const dbInvoice = await Invoice.findById(result.data._id).lean();
    expect(dbInvoice.tenantId.toString()).toBe(TENANT_A_ID.toString());
  });
});

describe('Role enforcement — write tools', () => {
  let data;

  beforeEach(async () => {
    data = await seedData();
  });

  it('worker is blocked from createCustomer', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'worker', businessType: 'cleaning' } });
    const result = await tools.createCustomer.execute({ firstName: 'Test', lastName: 'User' });
    expect(result).toEqual({ error: expect.stringMatching(/role.*permission|cannot/i) });
  });

  it('worker is blocked from createJob', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'worker', businessType: 'cleaning' } });
    const result = await tools.createJob.execute({
      customerId: data.customerA._id.toString(),
      serviceId: data.serviceA._id.toString(),
      scheduledDate: new Date().toISOString(),
    });
    expect(result).toEqual({ error: expect.stringMatching(/role.*permission|cannot/i) });
  });

  it('worker is blocked from updateJobStatus', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'worker', businessType: 'cleaning' } });
    const result = await tools.updateJobStatus.execute({ jobId: data.jobA._id.toString(), status: 'completed' });
    expect(result).toEqual({ error: expect.stringMatching(/role.*permission|cannot/i) });
  });

  it('worker is blocked from createInvoice', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'worker', businessType: 'cleaning' } });
    const result = await tools.createInvoice.execute({
      customerId: data.customerA._id.toString(),
      dueDate: new Date().toISOString(),
      items: [{ description: 'Test', quantity: 1, unitPrice: 50 }],
    });
    expect(result).toEqual({ error: expect.stringMatching(/role.*permission|cannot/i) });
  });

  it('worker is blocked from confirmAction', async () => {
    // First create a pending action as owner
    const ownerTools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const pending = await ownerTools.createCustomer.execute({ firstName: 'Test', lastName: 'User' });
    expect(pending.pending).toBe(true);

    // Try to confirm as worker
    const workerTools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'worker', businessType: 'cleaning' } });
    const result = await workerTools.confirmAction.execute({ confirmationCode: pending.confirmationCode });
    expect(result).toEqual({ error: expect.stringMatching(/role.*permission|cannot/i) });
  });

  it('staff is blocked from write tools', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'staff', businessType: 'cleaning' } });
    const result = await tools.createJob.execute({
      customerId: data.customerA._id.toString(),
      serviceId: data.serviceA._id.toString(),
      scheduledDate: new Date().toISOString(),
    });
    expect(result).toEqual({ error: expect.stringMatching(/role.*permission|cannot/i) });
  });

  it('owner can still write', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.createCustomer.execute({ firstName: 'Owner', lastName: 'Write' });
    expect(result).toHaveProperty('pending', true);
  });

  it('manager_operations can still write', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'manager_operations', businessType: 'cleaning' } });
    const result = await tools.createCustomer.execute({ firstName: 'Mgr', lastName: 'Write' });
    expect(result).toHaveProperty('pending', true);
  });
});

describe('Role enforcement — assignedOnly jobs', () => {
  let data, workerId;

  beforeEach(async () => {
    data = await seedData();
    workerId = new mongoose.Types.ObjectId().toString();

    // Create a job assigned to the worker
    await Job.create({
      _id: new mongoose.Types.ObjectId(),
      tenantId: TENANT_A_ID,
      customerId: new mongoose.Types.ObjectId(data.customerA._id),
      title: 'Worker Job',
      scheduledStart: new Date('2026-06-15T10:00:00Z'),
      status: 'scheduled',
      assignedUsers: [workerId],
    });
  });

  it('worker sees only assigned jobs', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: workerId, role: 'worker', businessType: 'cleaning' } });
    const result = await tools.searchJobs.execute({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Worker Job');
  });

  it('owner sees all jobs (no assignedOnly filter)', async () => {
    const tools = buildTools({ user: { tenantId: TENANT_A_ID, id: USER_A_ID, role: 'owner', businessType: 'cleaning' } });
    const result = await tools.searchJobs.execute({ limit: 50 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});
