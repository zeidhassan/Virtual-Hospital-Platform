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

describe('Notifications API (Admin)', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/notifications - should return all notifications', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, message: 'Test 1' },
        { id: 2, message: 'Test 2' }
      ]
    });

    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM notifications ORDER BY id');
  });

  test('GET /api/notifications/:id - found', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, message: 'Welcome' }]
    });

    const res = await request(app)
      .get('/api/notifications/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Welcome');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM notifications WHERE id = $1', ['1']);
  });

  test('GET /api/notifications/:id - not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/notifications/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
