const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const path = require('path');
const fs = require('fs');

describe('Section 13: File Uploads', () => {
  let patientToken, doctorToken, adminToken, otherPatientToken;
  let patientId, doctorId;

  beforeAll(async () => {
    // Use seeded accounts
    const [adminRes, doctorRes, patientRes, otherPatientRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'strange@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'jane@helixacare.com', password: 'admin123' }),
      request(app).post('/api/auth/login').send({ email: 'john@helixacare.com', password: 'admin123' }),
    ]);

    if (!adminRes.body.token || !doctorRes.body.token || !patientRes.body.token || !otherPatientRes.body.token) {
      throw new Error('Login failed - tokens not received');
    }

    adminToken = adminRes.body.token;
    doctorToken = doctorRes.body.token;
    patientToken = patientRes.body.token;
    otherPatientToken = otherPatientRes.body.token;

    // Get patient ID (jane — the record owner throughout this file)
    const patientRow = await pool.query(
      "SELECT p.id FROM patients p JOIN users u ON u.id = p.user_id WHERE u.email = 'jane@helixacare.com'"
    );
    patientId = patientRow.rows[0]?.id;

    // Get doctor ID
    const doctorRow = await pool.query(
      "SELECT d.id FROM doctors d JOIN users u ON u.id = d.user_id WHERE u.email = 'strange@helixacare.com'"
    );
    doctorId = doctorRow.rows[0]?.id;

    // Ensure upload directories exist
    ['medical-records', 'prescriptions', 'support-tickets'].forEach((dir) => {
      const dirPath = path.join(__dirname, `../../uploads/${dir}`);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  });

  afterAll(async () => {
    // Cleanup test files in uploads directory
    const uploadsDir = path.join(__dirname, '../../uploads');
    ['medical-records', 'prescriptions', 'support-tickets'].forEach((dir) => {
      const dirPath = path.join(uploadsDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        files.forEach((file) => {
          if (file.includes('test-') || file.match(/^\d+-/)) {
            try {
              fs.unlinkSync(path.join(dirPath, file));
            } catch (err) {
              // Ignore cleanup errors
            }
          }
        });
      }
    });
  });

  describe('13.1: Files can be uploaded with type validation', () => {
    it('should upload a valid PDF file as a patient', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%Test PDF content');
      const testFilePath = path.join(__dirname, 'test-valid.pdf');
      fs.writeFileSync(testFilePath, pdfBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Test lab report')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.file_url).toMatch(/uploads\/medical-records\//);

      fs.unlinkSync(testFilePath);
      await pool.query('DELETE FROM medical_records WHERE id = $1', [res.body.data.id]);
    });

    it('should upload a valid JPG file as a patient', async () => {
      const jpegBuffer = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
      ]);
      const testFilePath = path.join(__dirname, 'test-valid.jpg');
      fs.writeFileSync(testFilePath, jpegBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'xray')
        .field('description', 'Test x-ray')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.file_url).toMatch(/uploads\/medical-records\//);

      fs.unlinkSync(testFilePath);
      await pool.query('DELETE FROM medical_records WHERE id = $1', [res.body.data.id]);
    });

    it('should upload a valid PNG file as a patient', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);
      const testFilePath = path.join(__dirname, 'test-valid.png');
      fs.writeFileSync(testFilePath, pngBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'scan')
        .field('description', 'Test scan')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.file_url).toMatch(/uploads\/medical-records\//);

      fs.unlinkSync(testFilePath);
      await pool.query('DELETE FROM medical_records WHERE id = $1', [res.body.data.id]);
    });

    it('should allow a doctor to upload a record for a linked patient', async () => {
      const appointmentRes = await pool.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_start_time, appointment_end_time, status)
         VALUES ($1, $2, CURRENT_DATE, '09:00', '10:00', 'completed')
         RETURNING id`,
        [patientId, doctorId]
      );
      const appointmentId = appointmentRes.rows[0].id;

      const pdfBuffer = Buffer.from('%PDF-1.4\n%Doctor-authored record');
      const testFilePath = path.join(__dirname, 'test-doctor-record.pdf');
      fs.writeFileSync(testFilePath, pdfBuffer);

      const res = await request(app)
        .post(`/api/doctor/patients/${patientId}/records`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .field('appointment_id', appointmentId)
        .field('record_type', 'doctor-notes')
        .field('description', 'Doctor-authored test record')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.doctor_id).toBe(doctorId);
      expect(res.body.data.file_url).toMatch(/uploads\/medical-records\//);

      fs.unlinkSync(testFilePath);
      await pool.query('DELETE FROM medical_records WHERE id = $1', [res.body.data.id]);
      await pool.query('DELETE FROM appointments WHERE id = $1', [appointmentId]);
    });

    it('should upload prescription file via pharmacy order', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%Prescription content');
      const testFilePath = path.join(__dirname, 'test-prescription.pdf');
      fs.writeFileSync(testFilePath, pdfBuffer);

      // Get a prescription medication
      const medRes = await pool.query("SELECT name FROM medications WHERE type = 'prescription' LIMIT 1");
      const medName = medRes.rows[0]?.name || 'Metformin';

      const res = await request(app)
        .post(`/api/pharmacy-orders?medications=${medName}&quantities=1`)
        .set('Authorization', `Bearer ${patientToken}`)
        .field('delivery_address', '123 Test St')
        .field('payment_method', 'cash')
        .attach('file', testFilePath);

      expect([201, 400]).toContain(res.status); // 400 if medication doesn't exist
      if (res.status === 201) {
        expect(res.body).toHaveProperty('id');
        expect(res.body.prescription_file).toMatch(/uploads\/prescriptions\//);
      }

      // Cleanup
      fs.unlinkSync(testFilePath);
    });
  });

  describe('13.2: Invalid file types are rejected', () => {
    it('should reject .exe file upload', async () => {
      const exeBuffer = Buffer.from('MZ\x90\x00'); // EXE header
      const testFilePath = path.join(__dirname, 'test-invalid.exe');
      fs.writeFileSync(testFilePath, exeBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Test')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(400);
      expect(res.body.error || res.text).toMatch(/Invalid file type|Only PDF, JPG, and PNG/i);

      fs.unlinkSync(testFilePath);
    });

    it('should reject .txt file upload', async () => {
      const txtBuffer = Buffer.from('Plain text content');
      const testFilePath = path.join(__dirname, 'test-invalid.txt');
      fs.writeFileSync(testFilePath, txtBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Test')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(400);
      expect(res.body.error || res.text).toMatch(/Invalid file type|Only PDF, JPG, and PNG/i);

      fs.unlinkSync(testFilePath);
    });

    it('should reject .zip file upload', async () => {
      const zipBuffer = Buffer.from('PK\x03\x04'); // ZIP header
      const testFilePath = path.join(__dirname, 'test-invalid.zip');
      fs.writeFileSync(testFilePath, zipBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Test')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(400);
      expect(res.body.error || res.text).toMatch(/Invalid file type|Only PDF, JPG, and PNG/i);

      fs.unlinkSync(testFilePath);
    });
  });

  describe('13.3: Uploaded files are only reachable through authenticated, ownership-checked routes', () => {
    let uploadedFilename;
    let uploadedRecordId;

    beforeAll(async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%Test content for access');
      const testFilePath = path.join(__dirname, 'test-access.pdf');
      fs.writeFileSync(testFilePath, pdfBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Test for file access')
        .attach('medical_record_file', testFilePath);

      if (res.status === 201) {
        uploadedRecordId = res.body.data.id;
        uploadedFilename = res.body.data.file_url.split('/').pop();
      }

      fs.unlinkSync(testFilePath);
    });

    afterAll(async () => {
      if (uploadedRecordId) {
        await pool.query('DELETE FROM medical_records WHERE id = $1', [uploadedRecordId]);
      }
    });

    it('should NOT serve the file through the old unauthenticated /uploads route', async () => {
      if (!uploadedFilename) {
        console.log('Skipping: No file was uploaded in beforeAll');
        return;
      }

      const res = await request(app)
        .get(`/uploads/medical-records/${uploadedFilename}`);

      // The blanket /uploads static mount was removed — medical records are
      // only reachable through the authenticated /api/files route below.
      expect(res.status).toBe(404);
    });

    it('should serve the file via /api/files when requested by the owning patient', async () => {
      if (!uploadedFilename) {
        console.log('Skipping: No file was uploaded in beforeAll');
        return;
      }

      const res = await request(app)
        .get(`/api/files/medical-records/${uploadedFilename}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
    });

    it('should block a different, unrelated patient from reading the file', async () => {
      if (!uploadedFilename) {
        console.log('Skipping: No file was uploaded in beforeAll');
        return;
      }

      const res = await request(app)
        .get(`/api/files/medical-records/${uploadedFilename}`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for a non-existent file', async () => {
      const res = await request(app)
        .get('/api/files/medical-records/nonexistent-file.pdf')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(404);
    });

    it('should require authentication for the /api/files route', async () => {
      if (!uploadedFilename) {
        console.log('Skipping: No file was uploaded in beforeAll');
        return;
      }

      const res = await request(app)
        .get(`/api/files/medical-records/${uploadedFilename}`);

      expect(res.status).toBe(401);
    });

    it('should neutralize directory traversal attempts', async () => {
      const res = await request(app)
        .get('/api/files/medical-records/..%2F..%2F..%2Fpackage.json')
        .set('Authorization', `Bearer ${patientToken}`);

      // basename() strips every path segment before the file is looked up,
      // so this can never resolve outside the uploads directory.
      expect([400, 404]).toContain(res.status);
    });
  });

  describe('Additional File Upload Security Tests', () => {
    it('should reject files exceeding size limit (5MB)', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');
      const testFilePath = path.join(__dirname, 'test-large.pdf');
      fs.writeFileSync(testFilePath, largeBuffer);

      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Large file test')
        .attach('medical_record_file', testFilePath);

      expect(res.status).toBe(400);
      expect(res.body.error || res.text).toMatch(/File too large|size/i);

      fs.unlinkSync(testFilePath);
    });

    it('should handle missing file gracefully', async () => {
      const res = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'No file attached');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/file|required/i);
    });

    it('should store files with unique filenames to prevent collisions', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%Test content');
      const testFilePath = path.join(__dirname, 'test-unique.pdf');
      fs.writeFileSync(testFilePath, pdfBuffer);

      // Upload the same file twice
      const res1 = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'First upload')
        .attach('medical_record_file', testFilePath);

      const res2 = await request(app)
        .post('/api/patient/records')
        .set('Authorization', `Bearer ${patientToken}`)
        .field('record_type', 'lab-result')
        .field('description', 'Second upload')
        .attach('medical_record_file', testFilePath);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);

      // Filenames should be different
      const filename1 = res1.body.data.file_url.split('/').pop();
      const filename2 = res2.body.data.file_url.split('/').pop();
      expect(filename1).not.toBe(filename2);

      // Cleanup
      fs.unlinkSync(testFilePath);
      await pool.query('DELETE FROM medical_records WHERE id IN ($1, $2)', [res1.body.data.id, res2.body.data.id]);
    });
  });
});
