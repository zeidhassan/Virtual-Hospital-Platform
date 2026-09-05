// tests/integration/section12.test.js
// Section 12: Support Tickets
// Tests patient ticket creation, admin reply, and ticket listing

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Section 12: Support Tickets', () => {
  let patientToken, adminToken, doctorToken;
  let patientId, adminUserId, doctorId;
  let createdTicketId;

  beforeAll(async () => {
    // Login as patient
    const patientRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@helixacare.com', password: 'admin123' });
    patientToken = patientRes.body.token;
    patientId = patientRes.body.user.patientId;

    // Login as admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@helixacare.com', password: 'admin123' });
    adminToken = adminRes.body.token;
    adminUserId = adminRes.body.user.id;

    // Login as doctor
    const doctorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'strange@helixacare.com', password: 'admin123' });
    doctorToken = doctorRes.body.token;
    doctorId = doctorRes.body.user.doctorId;
  });

  afterAll(async () => {
    // Clean up test tickets
    if (createdTicketId) {
      await pool.query('DELETE FROM support_ticket_replies WHERE ticket_id = $1', [createdTicketId]);
      await pool.query('DELETE FROM support_tickets WHERE id = $1', [createdTicketId]);
    }
  });

  describe('12.1: Patient can create a support ticket', () => {
    it('should create a support ticket as patient', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          subject: 'Test Support Ticket',
          description: 'This is a test ticket for integration testing',
          category: 'Technical',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.subject).toBe('Test Support Ticket');
      expect(res.body.category).toBe('Technical');
      expect(res.body.status).toBe('open');
      expect(res.body.patient_assigned).toBe(patientId);

      createdTicketId = res.body.id;
    });

    it('should reject ticket creation without subject', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          description: 'Missing subject',
          category: 'Other',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject ticket creation without description', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          subject: 'Test',
          category: 'Other',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject ticket creation without auth', async () => {
      const res = await request(app)
        .post('/api/support-tickets/patient')
        .send({
          subject: 'Unauthorized Test',
          description: 'This should fail',
          category: 'Other',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('12.2: Admin can reply to support tickets', () => {
    it('should allow admin to reply to a ticket', async () => {
      const res = await request(app)
        .post(`/api/support-tickets/admin/${createdTicketId}/reply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'Thank you for contacting support. We are looking into your issue.',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.ticket_id).toBe(createdTicketId);
      expect(res.body.user_id).toBe(adminUserId);
      expect(res.body.message).toBe('Thank you for contacting support. We are looking into your issue.');
    });

    it('should reject reply without message', async () => {
      const res = await request(app)
        .post(`/api/support-tickets/admin/${createdTicketId}/reply`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('should reject reply to non-existent ticket', async () => {
      const res = await request(app)
        .post('/api/support-tickets/admin/999999/reply')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          message: 'This should fail',
        });

      expect(res.status).toBe(404);
    });

    it('should reject reply without admin auth', async () => {
      const res = await request(app)
        .post(`/api/support-tickets/admin/${createdTicketId}/reply`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Unauthorized reply',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('12.3: User can view own tickets and replies', () => {
    it('should allow patient to view their tickets', async () => {
      const res = await request(app)
        .get('/api/support-tickets/patient')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);

      const ticket = res.body.data.find(t => t.id === createdTicketId);
      expect(ticket).toBeDefined();
      expect(ticket.subject).toBe('Test Support Ticket');
    });

    it('should allow patient to view replies to their ticket', async () => {
      const res = await request(app)
        .get(`/api/support-tickets/${createdTicketId}/replies`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('rows');
      expect(Array.isArray(res.body.rows)).toBe(true);
      expect(res.body.rows.length).toBeGreaterThan(0);

      const adminReply = res.body.rows.find(r => r.user_id === adminUserId);
      expect(adminReply).toBeDefined();
      expect(adminReply.message).toContain('Thank you for contacting support');
    });

    it('should allow admin to view all tickets', async () => {
      const res = await request(app)
        .get('/api/support-tickets/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);

      const ticket = res.body.data.find(t => t.id === createdTicketId);
      expect(ticket).toBeDefined();
    });

    it('should reject viewing tickets without auth', async () => {
      const res = await request(app)
        .get('/api/support-tickets/patient');

      expect(res.status).toBe(401);
    });

    it('should reject patient viewing replies to another patient\'s ticket', async () => {
      // Create a ticket as admin
      const adminTicketRes = await request(app)
        .post('/api/support-tickets/admin')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          subject: 'Admin Test Ticket',
          description: 'This is an admin ticket',
          category: 'Other',
        });

      const adminTicketId = adminTicketRes.body.id;

      // Try to view replies as patient
      const res = await request(app)
        .get(`/api/support-tickets/${adminTicketId}/replies`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);

      // Clean up
      await pool.query('DELETE FROM support_tickets WHERE id = $1', [adminTicketId]);
    });
  });

  describe('Additional: Status updates and filtering', () => {
    it('should allow admin to update ticket status', async () => {
      const res = await request(app)
        .patch(`/api/support-tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in progress',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('in progress');
    });

    it('should allow patient to close their own ticket', async () => {
      const res = await request(app)
        .patch(`/api/support-tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          status: 'closed',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('closed');
    });

    it('should support filtering tickets by status', async () => {
      const res = await request(app)
        .get('/api/support-tickets/admin?status=closed')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');

      const closedTickets = res.body.data.filter(t => t.status === 'closed');
      expect(closedTickets.length).toBeGreaterThan(0);
    });

    it('should support filtering tickets by category', async () => {
      const res = await request(app)
        .get('/api/support-tickets/admin?category=Technical')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');

      const technicalTickets = res.body.data.filter(t => t.category === 'Technical');
      expect(technicalTickets.length).toBeGreaterThan(0);
    });
  });

  describe('Additional: Patient reply functionality', () => {
    it('should allow patient to reply to their own ticket', async () => {
      // Reopen the ticket first
      await request(app)
        .patch(`/api/support-tickets/${createdTicketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'open' });

      const res = await request(app)
        .post(`/api/support-tickets/patient/${createdTicketId}/reply`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          message: 'Thank you for the quick response!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.message).toBe('Thank you for the quick response!');
    });

    it('should reject patient replying to another patient\'s ticket', async () => {
      // Create a ticket as admin assigned to a different patient
      const { rows: [otherPatient] } = await pool.query(
        'SELECT id FROM patients WHERE id != $1 LIMIT 1',
        [patientId]
      );

      if (otherPatient) {
        const adminTicketRes = await request(app)
          .post('/api/support-tickets/admin')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            subject: 'Other Patient Ticket',
            description: 'This is for another patient',
            category: 'Other',
            patient_assigned: otherPatient.id,
          });

        const otherTicketId = adminTicketRes.body.id;

        const res = await request(app)
          .post(`/api/support-tickets/patient/${otherTicketId}/reply`)
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            message: 'Unauthorized reply',
          });

        expect(res.status).toBe(403);

        // Clean up
        await pool.query('DELETE FROM support_tickets WHERE id = $1', [otherTicketId]);
      }
    });
  });
});
