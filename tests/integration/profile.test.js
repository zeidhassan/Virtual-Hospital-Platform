// Closes a real test-coverage gap found during a full-project audit:
// /api/profile (profile view/update, profile picture upload, billing address
// CRUD, and payment method updates) had zero automated tests.
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Profile API', () => {
  let patientToken, otherPatientToken, patientUserId;
  let createdAddressId, existingPaymentMethodId;

  beforeAll(async () => {
    const [janeRes, markRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'john@helixacare.com', password: 'admin123' }),
    ]);
    patientToken = janeRes.body.token;
    otherPatientToken = markRes.body.token;
    patientUserId = janeRes.body.user.id;

    const pm = await pool.query(
      `INSERT INTO payment_methods (user_id, provider, cardholder_name, brand, last4, exp_month, exp_year)
       VALUES ($1, 'card', 'Jane Smith', 'visa', '1234', 6, 2030) RETURNING id`,
      [patientUserId]
    );
    existingPaymentMethodId = pm.rows[0].id;
  });

  afterAll(async () => {
    if (createdAddressId) await pool.query('DELETE FROM billing_addresses WHERE id = $1', [createdAddressId]);
    if (existingPaymentMethodId) await pool.query('DELETE FROM payment_methods WHERE id = $1', [existingPaymentMethodId]);
  });

  it('unauthenticated request returns 401', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/profile returns user, addresses, payment_methods, and defaults', async () => {
    const res = await request(app).get('/api/profile').set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('jane@helixacare.com');
    expect(res.body).toHaveProperty('addresses');
    expect(res.body).toHaveProperty('payment_methods');
    expect(res.body).toHaveProperty('defaults');
  });

  it('GET /api/profile/me is an alias for the same data', async () => {
    const res = await request(app).get('/api/profile/me').set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('jane@helixacare.com');
  });

  describe('PATCH /api/profile', () => {
    it('updates full_name and reverts it', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ full_name: 'Jane Test Updated' });
      expect(res.statusCode).toBe(200);
      expect(res.body.full_name).toBe('Jane Test Updated');

      const revert = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ full_name: 'Jane Smith' });
      expect(revert.statusCode).toBe(200);
    });

    it('rejects an invalid email with 400', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ email: 'not-an-email' });
      expect(res.statusCode).toBe(400);
    });

    it('rejects an email already used by another account with 409', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ email: 'admin@helixacare.com' });
      expect(res.statusCode).toBe(409);
    });

    it('rejects an empty payload with 400', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('updates patient-specific fields (allergies) via the same endpoint', async () => {
      const res = await request(app)
        .patch('/api/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ allergies: 'Penicillin (test)' });
      expect(res.statusCode).toBe(200);
      expect(res.body.allergies).toBe('Penicillin (test)');
    });

    it('/update-profile alias behaves the same way', async () => {
      const res = await request(app)
        .patch('/api/profile/update-profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ full_name: 'Jane Smith' });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('PATCH /api/profile/picture', () => {
    it('rejects a request with no file with 400', async () => {
      const res = await request(app)
        .patch('/api/profile/picture')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(400);
    });

    it('unauthenticated request returns 401', async () => {
      const res = await request(app).patch('/api/profile/picture');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('Billing addresses', () => {
    it('POST /api/profile/create-billing-address creates an address', async () => {
      const res = await request(app)
        .post('/api/profile/create-billing-address')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ addr_type: 'billing', first_name: 'Jane', last_name: 'Smith', line1: '123 Test St', city: 'Testville', country_code: 'MY' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      createdAddressId = res.body.id;
    });

    it('rejects a missing required field with 400', async () => {
      const res = await request(app)
        .post('/api/profile/create-billing-address')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ addr_type: 'billing', first_name: 'Jane' });
      expect(res.statusCode).toBe(400);
    });

    it('PATCH /api/profile/update-billing-address/:id updates the address', async () => {
      const res = await request(app)
        .patch(`/api/profile/update-billing-address/${createdAddressId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ city: 'Updated City' });
      expect(res.statusCode).toBe(200);
      expect(res.body.city).toBe('Updated City');
    });

    it('another patient cannot update this address (404, not leaked as 403)', async () => {
      const res = await request(app)
        .patch(`/api/profile/update-billing-address/${createdAddressId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({ city: 'Hijacked City' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/profile/update-payment-method/:id', () => {
    it('updates the cardholder name', async () => {
      const res = await request(app)
        .patch(`/api/profile/update-payment-method/${existingPaymentMethodId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ cardholder_name: 'Jane Updated' });
      expect(res.statusCode).toBe(200);
      expect(res.body.cardholder_name).toBe('Jane Updated');
    });

    it('rejects an attempt to store a raw card number with 400', async () => {
      const res = await request(app)
        .patch(`/api/profile/update-payment-method/${existingPaymentMethodId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ card_number: '4111111111111111' });
      expect(res.statusCode).toBe(400);
    });

    it('another patient gets 404, not another user\'s payment method', async () => {
      const res = await request(app)
        .patch(`/api/profile/update-payment-method/${existingPaymentMethodId}`)
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({ cardholder_name: 'Hijacked' });
      expect(res.statusCode).toBe(404);
    });

    it('a nonexistent payment method id returns 404', async () => {
      const res = await request(app)
        .patch('/api/profile/update-payment-method/999999')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ cardholder_name: 'X' });
      expect(res.statusCode).toBe(404);
    });
  });
});
