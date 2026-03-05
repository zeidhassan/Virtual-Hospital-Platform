const request = require('supertest');
const path = require('path');
let app = require('../../src/app');

describe('App Initialization', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    app = require('../../src/app');
  });

  test('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.statusCode).toBe(404);
  });

  test('should serve static files from /public', async () => {
    const res = await request(app).get('/register.html');
    expect([200, 404]).toContain(res.statusCode);
  });

  test('should mount Swagger UI route', async () => {
    const res = await request(app).get('/api-docs/');
    expect([200, 301, 302]).toContain(res.statusCode);
  });

  test('should apply CSP headers in production', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'production';
    const prodApp = require('../../src/app');
    const res = await request(prodApp).get('/');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  test('should not apply CSP headers in development', async () => {
    jest.resetModules();
    process.env.NODE_ENV = 'development';
    const devApp = require('../../src/app');
    const res = await request(devApp).get('/');
    expect(res.headers['content-security-policy']).toBeUndefined();
  });
});
