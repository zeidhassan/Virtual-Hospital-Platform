jest.mock('@paypal/checkout-server-sdk', () => {
  const mockEnv = { name: 'SandboxEnv' };
  return {
    core: {
      SandboxEnvironment: jest.fn().mockImplementation(() => mockEnv),
      LiveEnvironment: jest.fn(), // Optional if you test live mode
      PayPalHttpClient: jest.fn().mockImplementation((env) => ({
        environment: env
      }))
    }
  };
});

describe('PayPal Client Setup', () => {
  it('should initialize sandbox environment', () => {
    process.env.PAYPAL_ENVIRONMENT = 'sandbox';
    process.env.PAYPAL_CLIENT_ID = 'dummy';
    process.env.PAYPAL_CLIENT_SECRET = 'dummy';

    const { client } = require('../../src/utils/paypalClient');
    const paypal = client();

    expect(paypal.environment).toEqual({ name: 'SandboxEnv' });
  });
});
