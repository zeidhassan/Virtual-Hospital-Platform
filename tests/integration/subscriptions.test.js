const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

jest.mock('../../src/config/db');

// Mock token and role
const adminToken = 'mock-admin-token';
jest.mock('../../src/middleware/verifyToken', () => (req, res, next) => {
  req.user = { id: 1, role: 'admin' };
  next();
});
jest.mock('../../src/middleware/requireRole', () => () => (req, res, next) => next());

describe('Subscriptions API (Admin)', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/subscriptions - should return all subscriptions', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, user_id: 101, plan_id: 1 },
        { id: 2, user_id: 102, plan_id: 2 }
      ]
    });

    const res = await request(app)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM subscriptions ORDER BY id');
  });

  test('GET /api/subscriptions/:id - found', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, user_id: 101, plan_id: 1 }]
    });

    const res = await request(app)
      .get('/api/subscriptions/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user_id).toBe(101);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM subscriptions WHERE id = $1', ['1']);
  });

  test('GET /api/subscriptions/:id - not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/subscriptions/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
