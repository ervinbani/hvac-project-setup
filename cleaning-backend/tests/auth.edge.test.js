/**
 * Edge cases: Authentication & JWT
 */
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { connect, disconnect, clearCollections } = require('./setup');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearCollections(); });

const validPayload = {
  tenantName: 'Test Co',
  slug: 'test-co',
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@test.com',
  password: 'Password1!',
};

describe('POST /api/auth/register — edge cases', () => {
  it('rejects when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ tenantName: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects duplicate slug (case-insensitive)', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, slug: 'TEST-CO', email: 'other@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/slug/i);
  });

  it('stores email in lowercase regardless of input', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, email: 'ALICE@TEST.COM' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('alice@test.com');
  });

  it('returns a JWT token on success', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
  });

  it('assigns owner role to the first user', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);
    expect(res.body.data.user.role).toBe('owner');
  });
});

describe('POST /api/auth/login — edge cases', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validPayload);
  });

  it('rejects missing email or password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'alice@test.com' });
    expect(res.status).toBe(400);
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'Password1!' });
    expect(res.status).toBe(401);
  });

  it('rejects login with bad slug', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@test.com', password: 'Password1!', slug: 'nonexistent' });
    expect(res.status).toBe(401);
  });

  it('accepts login in a case-insensitive manner for email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ALICE@TEST.COM', password: 'Password1!' });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });
});

describe('GET /api/auth/me — edge cases', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a malformed token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('returns 401 with a token signed by wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const fakeToken = jwt.sign({ userId: 'abc', tenantId: 'xyz', role: 'owner' }, 'wrong-secret');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);
    expect(res.status).toBe(401);
  });

  it('returns profile for a valid token', async () => {
    const reg = await request(app).post('/api/auth/register').send(validPayload);
    const { token } = reg.body.data;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.email).toBe('alice@test.com');
  });
});
