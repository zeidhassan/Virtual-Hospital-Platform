const jwt = require('jsonwebtoken');
const verifyToken = require('../../src/middleware/verifyToken');
const requireRole = require('../../src/middleware/requireRole');

jest.mock('jsonwebtoken');
jest.mock('../../src/config/db', () => ({
  query: jest.fn()
}));
const pool = require('../../src/config/db');

describe('verifyToken middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    jest.clearAllMocks();
  });

  test('should call next with valid token (no jti)', async () => {
    req.headers['authorization'] = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 1, role: 'admin' });

    await verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', expect.any(String));
    expect(req.user).toEqual({ id: 1, role: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  test('should call next with valid token (jti not blacklisted)', async () => {
    req.headers['authorization'] = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 1, role: 'admin', jti: 'test-jti-123' });
    pool.query.mockResolvedValue({ rowCount: 0 });

    await verifyToken(req, res, next);

    expect(pool.query).toHaveBeenCalledWith(
      'SELECT 1 FROM token_blacklist WHERE jti = $1',
      ['test-jti-123']
    );
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 if token is blacklisted', async () => {
    req.headers['authorization'] = 'Bearer blacklistedtoken';
    jwt.verify.mockReturnValue({ id: 1, role: 'admin', jti: 'blacklisted-jti' });
    pool.query.mockResolvedValue({ rowCount: 1 });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token has been revoked. Please log in again.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 if no token', async () => {
    await verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided.' });
  });

  test('should return 403 if token invalid', async () => {
    req.headers['authorization'] = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token.' });
  });
});

describe('requireRole middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { user: { role: 'admin' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  test('should call next if role matches', () => {
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('should return 403 if role does not match', () => {
    requireRole('doctor')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access denied. Requires: doctor' });
  });

  test('should return 401 if no user in request', () => {
    req = {}; // no user
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized. No user info provided.' });
  });
});
