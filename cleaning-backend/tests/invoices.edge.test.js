/**
 * Edge cases: Invoices — server-side total calculation, cross-tenant, status transitions
 */
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { connect, disconnect, clearCollections } = require('./setup');

beforeAll(async () => { await connect(); });
afterAll(async () => { await disconnect(); });
afterEach(async () => { await clearCollections(); });

async function setup(slug, email) {
  const reg = await request(app).post('/api/auth/register').send({
    tenantName: slug, slug, firstName: 'Owner', lastName: 'X', email, password: 'Password1!',
  });
  const token = reg.body.data.token;
  const customer = (
    await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Bob', lastName: 'Builder', email: 'bob@build.com', phone: '555-9999' })
  ).body.data;
  return { token, customer };
}

describe('POST /api/invoices — server-side total calculation', () => {
  it('ignores client-supplied totals and recalculates server-side', async () => {
    const { token, customer } = await setup('invco', 'owner@inv.com');
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer._id,
        items: [{ description: 'Clean', quantity: 2, unitPrice: 100, total: 9999 }],
        taxRate: 7,
        // subtotal/tax/total sent by client should be ignored
        subtotal: 9999,
        tax: 9999,
        total: 9999,
      });
    expect(res.status).toBe(201);
    const inv = res.body.data;
    // 2 × 100 = 200 subtotal; 7% tax = 14; total = 214
    expect(inv.subtotal).toBe(200);
    expect(inv.tax).toBe(14);
    expect(inv.total).toBe(214);
  });

  it('handles zero-item invoice (total = 0)', async () => {
    const { token, customer } = await setup('zeroco', 'owner@zero.com');
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: customer._id, items: [] });
    expect(res.status).toBe(201);
    expect(res.body.data.total).toBe(0);
  });

  it('ignores negative unitPrice (treats as 0)', async () => {
    const { token, customer } = await setup('negco', 'owner@neg.com');
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer._id,
        items: [{ description: 'Discount', quantity: 1, unitPrice: -500 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.subtotal).toBe(0);
    expect(res.body.data.total).toBe(0);
  });

  it('truncates description to 500 characters', async () => {
    const { token, customer } = await setup('longco', 'owner@long.com');
    const longDesc = 'x'.repeat(600);
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: customer._id,
        items: [{ description: longDesc, quantity: 1, unitPrice: 10 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.items[0].description.length).toBe(500);
  });

  it('rejects missing customerId', async () => {
    const { token } = await setup('reqco', 'owner@req.com');
    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerId/i);
  });

  it('rejects customerId from a different tenant', async () => {
    const { token } = await setup('tenantA', 'owner@tenantA.com');
    const { customer: foreignCustomer } = await setup('tenantB', 'owner@tenantB.com');

    const res = await request(app)
      .post('/api/invoices')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: foreignCustomer._id, items: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/customerId/i);
  });
});

describe('PUT /api/invoices/:id — update edge cases', () => {
  it('ignores invalid status values', async () => {
    const { token, customer } = await setup('updco', 'owner@upd.com');
    const inv = (
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({ customerId: customer._id, items: [] })
    ).body.data;

    const res = await request(app)
      .put(`/api/invoices/${inv._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'hacked' });
    expect(res.status).toBe(200);
    // status should remain 'draft' (unchanged)
    expect(res.body.data.status).toBe('draft');
  });

  it('recalculates totals when items are updated', async () => {
    const { token, customer } = await setup('recalcco', 'owner@recalc.com');
    const inv = (
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({
          customerId: customer._id,
          taxRate: 7,
          items: [{ description: 'Old', quantity: 1, unitPrice: 50 }],
        })
    ).body.data;

    const res = await request(app)
      .put(`/api/invoices/${inv._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ description: 'New', quantity: 3, unitPrice: 100 }] });
    expect(res.status).toBe(200);
    // 3 × 100 = 300; 7% = 21; total = 321
    expect(res.body.data.subtotal).toBe(300);
    expect(res.body.data.total).toBe(321);
  });

  it('returns 404 for invoice from another tenant', async () => {
    const { token: t1, customer: c1 } = await setup('t1co', 'owner@t1.com');
    const { token: t2 } = await setup('t2co', 'owner@t2.com');

    const inv = (
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${t1}`)
        .send({ customerId: c1._id, items: [] })
    ).body.data;

    const res = await request(app)
      .put(`/api/invoices/${inv._id}`)
      .set('Authorization', `Bearer ${t2}`)
      .send({ status: 'paid' });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/invoices/:id/send — edge cases', () => {
  it('marks invoice as sent', async () => {
    const { token, customer } = await setup('sendco', 'owner@send.com');
    const inv = (
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${token}`)
        .send({ customerId: customer._id, items: [] })
    ).body.data;

    const res = await request(app)
      .post(`/api/invoices/${inv._id}/send`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.invoice.status).toBe('sent');
  });

  it('returns 404 for invoice from another tenant', async () => {
    const { token: t1, customer: c1 } = await setup('sendA', 'owner@sendA.com');
    const { token: t2 } = await setup('sendB', 'owner@sendB.com');

    const inv = (
      await request(app)
        .post('/api/invoices')
        .set('Authorization', `Bearer ${t1}`)
        .send({ customerId: c1._id, items: [] })
    ).body.data;

    const res = await request(app)
      .post(`/api/invoices/${inv._id}/send`)
      .set('Authorization', `Bearer ${t2}`);
    expect(res.status).toBe(404);
  });
});
