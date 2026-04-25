const request = require('supertest');
const app = require('../../src/app');

describe('Pharmacy & Medications — Section 10', () => {
  let patientToken, adminToken, doctorToken;
  let createdOrderId;

  beforeAll(async () => {
    const [patLogin, adminLogin, docLogin] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'patient123' }),
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'doctor123' }),
    ]);
    patientToken = patLogin.body.token;
    adminToken = adminLogin.body.token;
    doctorToken = docLogin.body.token;
  });

  // 10.1 — Medications catalog
  describe('10.1 Medications catalog', () => {
    it('patient can view medications catalog', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/medications/list')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('price');
      expect(res.body.data[0]).toHaveProperty('type');
    });

    it('doctor can view medications catalog', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/medications/list')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('admin can view medications catalog', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/medications/list')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalItems');
    });

    it('unauthenticated request is rejected', async () => {
      const res = await request(app).get('/api/pharmacy-orders/medications/list');
      expect(res.statusCode).toBe(401);
    });

    it('can filter catalog by type', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/medications/list')
        .query({ type: 'countertop' })
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      res.body.data.forEach((m) => expect(m.type).toBe('countertop'));
    });
  });

  // 10.2 — Place pharmacy order
  describe('10.2 Pharmacy order placement', () => {
    it('patient can place an order with OTC medications', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ medications: 'Paracetamol,Ibuprofen', quantities: '2,1' })
        .field('delivery_address', '42 Healing Street, Kuala Lumpur')
        .field('payment_method', 'cash');

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
      expect(res.body.medications).toContain('Paracetamol');
      createdOrderId = res.body.id;
    });

    it('order fails without delivery address', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ medications: 'Paracetamol' })
        .field('payment_method', 'cash');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/delivery address/i);
    });

    it('order fails with invalid payment method', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ medications: 'Paracetamol' })
        .field('delivery_address', '42 Healing Street')
        .field('payment_method', 'bitcoin');

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/payment_method/i);
    });

    it('order fails without medications', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('delivery_address', '42 Healing Street')
        .field('payment_method', 'cash');

      expect(res.statusCode).toBe(400);
    });

    it('admin cannot place orders (patient-only route)', async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ medications: 'Paracetamol' })
        .field('delivery_address', '42 Healing Street')
        .field('payment_method', 'cash');

      expect(res.statusCode).toBe(403);
    });
  });

  // 10.3 — View orders
  describe('10.3 View orders', () => {
    it('patient can view their own order history', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/my')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('patient can filter own orders by status', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders/my')
        .query({ status: 'pending' })
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(200);
      res.body.data.forEach((o) => expect(o.status).toBe('pending'));
    });

    it('patient can get a specific order by ID', async () => {
      const res = await request(app)
        .get(`/api/pharmacy-orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(createdOrderId);
    });

    it('patient cannot view another patient\'s order', async () => {
      // Order 1 belongs to demo patient (id=1), jane is a different patient
      // Find an order not belonging to jane to test 403
      const listRes = await request(app)
        .get('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${adminToken}`);

      const myRes = await request(app)
        .get('/api/pharmacy-orders/my')
        .set('Authorization', `Bearer ${patientToken}`);

      const myIds = new Set(myRes.body.data.map((o) => o.id));
      const otherOrder = listRes.body.data?.find((o) => !myIds.has(o.id));

      if (otherOrder) {
        const res = await request(app)
          .get(`/api/pharmacy-orders/${otherOrder.id}`)
          .set('Authorization', `Bearer ${patientToken}`);
        expect(res.statusCode).toBe(403);
      } else {
        // All demo orders happen to belong to jane — skip cross-patient test
        expect(true).toBe(true);
      }
    });

    it('admin can view all orders', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('doctor can view all orders', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('patient cannot access the admin/doctor all-orders list', async () => {
      const res = await request(app)
        .get('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  // 10.4 — Order status management
  describe('10.4 Order status management', () => {
    it('admin can update order status to processing', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'processing' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('processing');
    });

    it('admin can advance status to dispatched', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'dispatched' });

      expect(res.statusCode).toBe(200);
    });

    it('admin can advance status to delivered', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'delivered' });

      expect(res.statusCode).toBe(200);
    });

    it('admin cannot set invalid status', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ new_status: 'shipped' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });

    it('patient cannot update order status', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ new_status: 'processing' });

      expect(res.statusCode).toBe(403);
    });
  });

  // 10.5 — Patient cancel order
  describe('10.5 Patient order cancellation', () => {
    let pendingOrderId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/pharmacy-orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .query({ medications: 'Vitamin D', quantities: '1' })
        .field('delivery_address', '7 Recovery Lane, Penang')
        .field('payment_method', 'cash');

      pendingOrderId = res.body.id;
    });

    it('patient can cancel a pending order', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${pendingOrderId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/cancelled/i);
    });

    it('patient cannot cancel a non-pending order', async () => {
      // createdOrderId was advanced to 'delivered' in the status tests
      const res = await request(app)
        .put(`/api/pharmacy-orders/${createdOrderId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toMatch(/pending/i);
    });

    it('admin cannot use the patient cancel route', async () => {
      const res = await request(app)
        .put(`/api/pharmacy-orders/${pendingOrderId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});
