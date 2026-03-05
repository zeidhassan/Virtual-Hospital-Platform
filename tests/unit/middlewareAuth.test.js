const jwt = require('jsonwebtoken');
const verifyToken = require('../../src/middleware/verifyToken');
const requireRole = require('../../src/middleware/requireRole');

jest.mock('jsonwebtoken');

describe('verifyToken middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
  });

  test('should call next with valid token', () => {
    req.headers['authorization'] = 'Bearer validtoken';
    jwt.verify.mockReturnValue({ id: 1, role: 'admin' });

    verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('validtoken', expect.any(String));
    expect(req.user).toEqual({ id: 1, role: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 if no token', () => {
    verifyToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided.' });
  });

  test('should return 403 if token invalid', () => {
    req.headers['authorization'] = 'Bearer invalidtoken';
    jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

    verifyToken(req, res, next);

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
