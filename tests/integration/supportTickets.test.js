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

describe('Support Tickets API (Admin)', () => {
  afterEach(() => jest.clearAllMocks());

  test('GET /api/adminBoard/support-tickets - should return all tickets', async () => {
    // paginate() makes two queries: data then count
    pool.query
      .mockResolvedValueOnce({ rows: [
        { id: 1, subject: 'Help', message: 'I need help' },
        { id: 2, subject: 'Bug', message: 'App crashed' }
      ]})
      .mockResolvedValueOnce({ rows: [{ total: '2' }] });

    const res = await request(app)
      .get('/api/adminBoard/support-tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test('GET /api/adminBoard/support-tickets/:id - found', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, subject: 'Login Issue', message: 'Cannot log in' }]
    });

    const res = await request(app)
      .get('/api/adminBoard/support-tickets/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.subject).toBe('Login Issue');
    expect(pool.query).toHaveBeenCalledWith('SELECT * FROM support_tickets WHERE id = $1', ['1']);
  });

  test('GET /api/adminBoard/support-tickets/:id - not found', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/adminBoard/support-tickets/999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
