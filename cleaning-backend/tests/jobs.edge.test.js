/**
 * Edge cases: Jobs — role restrictions, cross-tenant isolation, status transitions
 */
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { connect, disconnect, clearCollections } = require('./setup');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearCollections(); });

// ─── helpers ─────────────────────────────────────────────────────────────────

async function registerAndLogin(slug, email, password = 'Password1!') {
  const reg = await request(app).post('/api/auth/register').send({
    tenantName: slug,
    slug,
    firstName: 'Test',
    lastName: 'User',
    email,
    password,
  });
  return reg.body.data.token;
}

async function createUser(token, role, email) {
  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${token}`)
    .send({ firstName: 'User', lastName: role, email, password: 'Password1!', role });
  return res.body.data;
}

async function loginAs(email, password = 'Password1!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data.token;
}

async function createCustomer(token) {
  const res = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ firstName: 'Jane', lastName: 'Doe', email: 'jane@doe.com', phone: '555-1234' });
  return res.body.data;
}

async function createJob(token, customerId, extra = {}) {
  const res = await request(app)
    .post('/api/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({ customerId, scheduledStart: new Date().toISOString(), ...extra });
  return res;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('POST /api/jobs — validation edge cases', () => {
  let token, customer;

  beforeEach(async () => {
    token = await registerAndLogin('acme', 'owner@acme.com');
    customer = await createCustomer(token);
  });

  it('rejects when customerId is missing', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ scheduledStart: new Date().toISOString() });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerId/);
  });

  it('rejects when scheduledStart is missing', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: customer._id });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/scheduledStart/);
  });

  it('rejects customerId from a different tenant', async () => {
    const otherToken = await registerAndLogin('rival', 'owner@rival.com');
    const otherCustomer = await createCustomer(otherToken);

    const res = await createJob(token, otherCustomer._id);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerId/i);
  });

  it('rejects serviceId from a different tenant', async () => {
    const otherToken = await registerAndLogin('rival2', 'owner@rival2.com');
    const svcRes = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: { en: 'Deep Clean', es: 'Limpieza Profunda' }, basePrice: 100, durationMinutes: 120 });
    const foreignServiceId = svcRes.body.data._id;

    const res = await createJob(token, customer._id, { serviceId: foreignServiceId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/serviceId/i);
  });

  it('rejects assignedUsers that do not belong to the tenant', async () => {
    const otherToken = await registerAndLogin('rival3', 'owner@rival3.com');
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${otherToken}`);
    const foreignUserId = me.body.data.id;

    const res = await createJob(token, customer._id, { assignedUsers: [foreignUserId] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignedUsers/i);
  });

  it('ignores unknown body fields (no field injection)', async () => {
    const res = await createJob(token, customer._id, { tenantId: 'hacked', __v: 99 });
    // Should succeed; tenantId should come from JWT, not body
    expect(res.status).toBe(201);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.body.data.tenantId).toBe(me.body.data.tenantId);
  });
});

describe('PATCH /api/jobs/:id/status — role & transition edge cases', () => {
  let ownerToken, cleanerToken, jobId, cleanerId;

  beforeEach(async () => {
    ownerToken = await registerAndLogin('cleaners-co', 'owner@cleaners.com');
    const cleanerUser = await createUser(ownerToken, 'cleaner', 'cleaner@cleaners.com');
    cleanerId = cleanerUser._id;
    cleanerToken = await loginAs('cleaner@cleaners.com');

    const customer = await createCustomer(ownerToken);
    const jobRes = await createJob(ownerToken, customer._id, { assignedUsers: [cleanerId] });
    jobId = jobRes.body.data._id;
  });

  it('rejects invalid status string', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ status: 'flying' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid status/i);
  });

  it('cleaner cannot set status to canceled', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${cleanerToken}`)
      .send({ status: 'canceled' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/cleaners/i);
  });

  it('cleaner cannot set status to confirmed', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${cleanerToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(403);
  });

  it('cleaner can set in_progress when assigned', async () => {
    const res = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${cleanerToken}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('in_progress');
  });

  it('unassigned cleaner cannot update job status', async () => {
    // Create another cleaner not assigned to this job
    await createUser(ownerToken, 'cleaner', 'cleaner2@cleaners.com');
    const otherCleanerToken = await loginAs('cleaner2@cleaners.com');

    const res = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${otherCleanerToken}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not assigned/i);
  });

  it('returns 404 for job from a different tenant', async () => {
    const otherToken = await registerAndLogin('other-co', 'owner@other.com');
    const res = await request(app)
      .patch(`/api/jobs/${jobId}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });

  it('owner can set any valid status', async () => {
    for (const status of ['confirmed', 'in_progress', 'completed', 'canceled']) {
      const res = await request(app)
        .patch(`/api/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(status);
    }
  });
});

describe('GET /api/jobs — cleaner isolation', () => {
  it('cleaner only sees their own assigned jobs', async () => {
    const ownerToken = await registerAndLogin('myco', 'owner@myco.com');
    const cleanerUser = await createUser(ownerToken, 'cleaner', 'mycleaner@myco.com');
    const cleanerToken = await loginAs('mycleaner@myco.com');

    const customer = await createCustomer(ownerToken);
    // Job 1: assigned to cleaner
    await createJob(ownerToken, customer._id, { assignedUsers: [cleanerUser._id], title: 'Assigned' });
    // Job 2: not assigned
    await createJob(ownerToken, customer._id, { title: 'Not Assigned' });

    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${cleanerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Assigned');
  });
});

describe('GET /api/jobs — pagination bounds', () => {
  it('clamps limit to 100 maximum', async () => {
    const token = await registerAndLogin('pageco', 'owner@page.com');
    const res = await request(app)
      .get('/api/jobs?limit=9999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('clamps page to minimum 1', async () => {
    const token = await registerAndLogin('pageco2', 'owner@page2.com');
    const res = await request(app)
      .get('/api/jobs?page=-5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  it('ignores invalid status filter values', async () => {
    const token = await registerAndLogin('filterco', 'owner@filter.com');
    const customer = await createCustomer(token);
    await createJob(token, customer._id);

    const res = await request(app)
      .get('/api/jobs?status[$ne]=scheduled')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Should not apply invalid filter — returns all jobs
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
