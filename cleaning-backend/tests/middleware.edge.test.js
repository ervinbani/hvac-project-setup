/**
 * Edge cases: Auth middleware, requireRole, error handler
 */
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { connect, disconnect, clearCollections } = require('./setup');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearCollections(); });

async function registerOwner(slug, email) {
  const res = await request(app).post('/api/auth/register').send({
    tenantName: slug, slug, firstName: 'O', lastName: 'O', email, password: 'Password1!',
  });
  return res.body.data.token;
}

async function createUser(ownerToken, role, email) {
  const res = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ firstName: 'U', lastName: 'U', email, password: 'Password1!', role });
  return res.body.data;
}

async function login(email) {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password1!' });
  return res.body.data.token;
}

describe('Auth middleware edge cases', () => {
  it('rejects request with no Authorization header', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no token/i);
  });

  it('rejects token missing "Bearer " prefix', async () => {
    const ownerToken = await registerOwner('mw1', 'owner@mw1.com');
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', ownerToken); // missing "Bearer "
    expect(res.status).toBe(401);
  });

  it('rejects expired token', async () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: 'abc', tenantId: 'xyz', role: 'owner' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });
});

describe('requireRole edge cases', () => {
  it('cleaner cannot delete a job (owner/manager only)', async () => {
    const ownerToken = await registerOwner('rolemw', 'owner@rolemw.com');
    await createUser(ownerToken, 'cleaner', 'cleaner@rolemw.com');
    const cleanerToken = await login('cleaner@rolemw.com');

    const customer = (
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ firstName: 'X', lastName: 'Y', email: 'x@y.com', phone: '111' })
    ).body.data;

    const job = (
      await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ customerId: customer._id, scheduledStart: new Date().toISOString() })
    ).body.data;

    const res = await request(app)
      .delete(`/api/jobs/${job._id}`)
      .set('Authorization', `Bearer ${cleanerToken}`);
    expect(res.status).toBe(403);
  });

  it('staff cannot delete a customer', async () => {
    const ownerToken = await registerOwner('staffmw', 'owner@staffmw.com');
    await createUser(ownerToken, 'staff', 'staff@staffmw.com');
    const staffToken = await login('staff@staffmw.com');

    const customer = (
      await request(app)
        .post('/api/customers')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ firstName: 'A', lastName: 'B', email: 'a@b.com', phone: '222' })
    ).body.data;

    const res = await request(app)
      .delete(`/api/customers/${customer._id}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('manager cannot delete a user (owner only)', async () => {
    const ownerToken = await registerOwner('mgrmw', 'owner@mgrmw.com');
    const staffUser = await createUser(ownerToken, 'staff', 'staff@mgrmw.com');
    await createUser(ownerToken, 'manager', 'mgr@mgrmw.com');
    const mgrToken = await login('mgr@mgrmw.com');

    const res = await request(app)
      .delete(`/api/users/${staffUser._id}`)
      .set('Authorization', `Bearer ${mgrToken}`);
    expect(res.status).toBe(403);
  });
});

describe('Error handler edge cases', () => {
  it('returns 400 for invalid MongoDB ObjectId', async () => {
    const ownerToken = await registerOwner('errmw', 'owner@errmw.com');
    const res = await request(app)
      .get('/api/jobs/not-a-valid-id')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid id/i);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
