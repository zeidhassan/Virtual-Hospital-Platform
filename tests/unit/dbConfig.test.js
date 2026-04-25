jest.mock('pg', () => {
  const mockConnect = jest.fn();
  const mockOn = jest.fn();
  const mockPool = jest.fn(() => ({ connect: mockConnect, on: mockOn }));
  return { Pool: mockPool };
});

const path = require('path');
const originalEnv = process.env;

describe('DB Config', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('should load .env.test when NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    const dotenv = require('dotenv');
    const configSpy = jest.spyOn(dotenv, 'config');

    require('../../src/config/db');
    expect(configSpy).toHaveBeenCalledWith({ path: path.resolve(process.cwd(), '.env.test') });
  });

  test('should load .env when NODE_ENV not set', () => {
    delete process.env.NODE_ENV;
    const dotenv = require('dotenv');
    const configSpy = jest.spyOn(dotenv, 'config');

    require('../../src/config/db');
    expect(configSpy).toHaveBeenCalledWith({ path: path.resolve(process.cwd(), '.env') });
  });

  test('should create pg Pool instance with correct config', () => {
    delete process.env.DATABASE_URL;
    delete process.env.DB_URL;
    process.env.DB_MODE = 'local';
    process.env.DB_USER = 'user';
    process.env.DB_HOST = 'localhost';
    process.env.DB_DATABASE = 'testdb';
    process.env.DB_PASSWORD = 'pass';
    process.env.DB_PORT = '5432';

    // Prevent dotenv from reloading .env.test (which would restore DATABASE_URL)
    const dotenv = require('dotenv');
    jest.spyOn(dotenv, 'config').mockReturnValue({});

    const { Pool } = require('pg');
    require('../../src/config/db');

    expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
      user: 'user',
      host: 'localhost',
      database: 'testdb',
      password: 'pass',
      port: 5432,
    }));
  });
});