const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');

describe('Section 11 — Messaging & Notifications', () => {
  let patientToken, doctorToken, adminToken, patientUserId, doctorUserId, adminUserId;
  let conversationId;

  beforeAll(async () => {
    const loginPatient = await request(app).post('/api/auth/login').send({
      email: 'jane@helixacare.com',
      password: 'admin123',
    });
    patientToken = loginPatient.body.token;
    patientUserId = loginPatient.body.user?.id;

    const loginDoctor = await request(app).post('/api/auth/login').send({
      email: 'strange@helixacare.com',
      password: 'admin123',
    });
    doctorToken = loginDoctor.body.token;
    doctorUserId = loginDoctor.body.user?.id;

    const loginAdmin = await request(app).post('/api/auth/login').send({
      email: 'admin@helixacare.com',
      password: 'admin123',
    });
    adminToken = loginAdmin.body.token;
    adminUserId = loginAdmin.body.user?.id;
  });

  afterAll(async () => {
    // Clean up test conversations
    if (conversationId) {
      await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
      await pool.query('DELETE FROM conversation_participants WHERE conversation_id = $1', [conversationId]);
      await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
    }
  });

  // ── 11.1-11.11 — Messaging with Conversations ──────────────────────────────

  describe('Messaging', () => {
    it('should reject unauthenticated conversation creation', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .send({ participant_ids: [doctorUserId] });
      expect(res.statusCode).toBe(401);
    });

    it('should return 400 when participant_ids missing', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(res.statusCode).toBe(400);
    });

    it('should allow patient to create conversation with assigned doctor', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ participant_ids: [doctorUserId] });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('id');
      conversationId = res.body.id;
    });

    it('should allow doctor to create conversation with assigned patient', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ participant_ids: [patientUserId] });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body).toHaveProperty('id');
    });

    it('should allow admin to create a direct (non-group) conversation with anyone', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ participant_ids: [patientUserId] });
      expect([200, 201]).toContain(res.statusCode);
      expect(res.body.is_group).toBe(false);

      await pool.query('DELETE FROM messages WHERE conversation_id = $1', [res.body.id]);
      await pool.query('DELETE FROM conversation_participants WHERE conversation_id = $1', [res.body.id]);
      await pool.query('DELETE FROM conversations WHERE id = $1', [res.body.id]);
    });

    it('should allow admin to create group conversation', async () => {
      const res = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participant_ids: [patientUserId, doctorUserId],
          title: 'Test Group Chat',
          is_group: true
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.is_group).toBe(true);
      expect(res.body.title).toBe('Test Group Chat');
    });

    it('should allow patient to send message in conversation', async () => {
      const res = await request(app)
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ message: 'Hello doctor, I have a question.' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.message).toBe('Hello doctor, I have a question.');
    });

    it('should allow doctor to send message in conversation', async () => {
      const res = await request(app)
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ message: 'Hi, please describe your symptoms.' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
    });

    it('should return conversation list for patient', async () => {
      const res = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      const conv = res.body.data.find(c => c.id === conversationId);
      expect(conv).toBeDefined();
      expect(conv).toHaveProperty('unread_count');
    });

    it('should return messages in conversation thread', async () => {
      const res = await request(app)
        .get(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0]).toHaveProperty('sender_name');
      expect(res.body.data[0]).toHaveProperty('sender_role');
    });

    it('should return available contacts for patient (assigned doctors)', async () => {
      const res = await request(app)
        .get('/api/messages/contacts')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should reject patient accessing conversation they are not part of', async () => {
      // Group conversations require at least 2 named participants besides the creator
      const { rows: [otherDoctor] } = await pool.query(
        `SELECT u.id FROM users u
         INNER JOIN doctors d ON d.user_id = u.id
         WHERE u.id != $1 LIMIT 1`,
        [doctorUserId]
      );

      // Create a group conversation as admin (only admins can create groups)
      const adminConvRes = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participant_ids: [doctorUserId, otherDoctor.id],
          title: 'Admin-Doctor Group',
          is_group: true
        });

      const adminConvId = adminConvRes.body.id;

      const res = await request(app)
        .get(`/api/messages/conversations/${adminConvId}/messages`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(403);
    });

    it('should mark conversation as read', async () => {
      const res = await request(app)
        .put(`/api/messages/conversations/${conversationId}/read`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(res.statusCode).toBe(200);
    });

    it('should reject patient messaging unassigned user', async () => {
      // Patient should not be able to message another patient
      // First, get another patient's user_id
      const { rows } = await pool.query(
        `SELECT u.id FROM users u
         INNER JOIN patients p ON p.user_id = u.id
         WHERE u.id != $1 LIMIT 1`,
        [patientUserId]
      );

      if (rows.length > 0) {
        const otherPatientId = rows[0].id;
        const res = await request(app)
          .post('/api/messages/conversations')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({ participant_ids: [otherPatientId] });
        expect(res.statusCode).toBe(403);
      }
    });
  });

  // ── 11.12-11.17 — Notifications ──────────────────────────────────────────

  describe('Notifications', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/notifications/my');
      expect(res.statusCode).toBe(401);
    });

    it('should return notifications for patient', async () => {
      const res = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(typeof res.body.count).toBe('number');
    });

    it('should mark a single notification as read', async () => {
      const listRes = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${patientToken}`);
      const unread = listRes.body.data.find(n => !n.is_read);
      if (unread) {
        const res = await request(app)
          .put(`/api/notifications/${unread.id}/read`)
          .set('Authorization', `Bearer ${patientToken}`);
        expect(res.statusCode).toBe(200);
      }
    });

    it('should return 404 when marking another user notification as read', async () => {
      const listRes = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${patientToken}`);
      const anyNotif = listRes.body.data[0];
      if (anyNotif) {
        const res = await request(app)
          .put(`/api/notifications/${anyNotif.id}/read`)
          .set('Authorization', `Bearer ${doctorToken}`);
        expect(res.statusCode).toBe(404);
      }
    });

    it('should mark all notifications as read', async () => {
      const res = await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('updated');
    });

    it('should return zero unread count after mark-all-read', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBe(0);
    });

    it('should support unread-only filter', async () => {
      const res = await request(app)
        .get('/api/notifications/my?unread=true')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(n => !n.is_read)).toBe(true);
    });

    it('should create notification when new message is sent', async () => {
      // Send message from patient to doctor
      await request(app)
        .post(`/api/messages/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ message: 'Test notification message' });

      // Check doctor received notification
      const res = await request(app)
        .get('/api/notifications/my')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.statusCode).toBe(200);
      const messageNotif = res.body.data.find(n => n.title === 'New Message');
      expect(messageNotif).toBeDefined();
    });
  });
});
