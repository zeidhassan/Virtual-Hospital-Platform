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

describe('Messages API (Admin)', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/messages - should return all messages', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { id: 1, subject: 'Hello', content: 'Welcome!' },
        { id: 2, subject: 'Notice', content: 'System update' }
      ]
    });

    const res = await request(app)
      .get('/api/messages')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM messages ORDER BY id');
  });

  test('GET /api/messages/:id - found', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, subject: 'Hello', content: 'Welcome!' }]
    });

    const res = await request(app)
      .get('/api/messages/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.subject).toBe('Hello');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM messages WHERE id = $1', ['1']);
  });

  test('GET /api/messages/:id - not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/messages/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
