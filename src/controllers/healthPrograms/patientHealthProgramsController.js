// src/controllers/healthPrograms/patientHealthProgramsController.js
// Patient self-service enrollment in the health_programs catalog.

const db = require('../../config/db');

const getPatientId = async (userId) => {
  const res = await db.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return res.rows.length > 0 ? res.rows[0].id : null;
};

// GET /api/health-programs — every catalog program, flagged with the
// caller's own enrollment status
exports.listPrograms = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    // The patient filter must live in the JOIN's ON clause, not a WHERE —
    // a WHERE on phe.patient_id would turn this into an inner join and drop
    // every program the patient hasn't enrolled in.
    const result = await db.query(
      `SELECT hp.*, (phe.id IS NOT NULL) AS is_enrolled, phe.enrolled_at
       FROM health_programs hp
       LEFT JOIN patient_health_programs phe
              ON phe.health_program_id = hp.id AND phe.patient_id = $1
       ORDER BY hp.start_date DESC NULLS LAST, hp.id`,
      [patientId]
    );
    res.json({ programs: result.rows });
  } catch (err) {
    console.error('Error listing health programs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/health-programs/my — only the programs the caller is enrolled in
exports.myPrograms = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    const result = await db.query(
      `SELECT hp.*, phe.enrolled_at
       FROM patient_health_programs phe
       JOIN health_programs hp ON hp.id = phe.health_program_id
       WHERE phe.patient_id = $1
       ORDER BY phe.enrolled_at DESC`,
      [patientId]
    );
    res.json({ programs: result.rows });
  } catch (err) {
    console.error('Error listing my health programs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/health-programs/:id/enroll
exports.enroll = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    const programId = req.params.id;

    // ON CONFLICT DO NOTHING avoids both a race window (two rapid clicks)
    // and handleDbError's 23505 branch, which would otherwise echo the raw
    // constraint detail ("Key (patient_id, health_program_id)=(1, 2) already
    // exists.") straight back to the patient.
    const result = await db.query(
      `INSERT INTO patient_health_programs (patient_id, health_program_id)
       VALUES ($1, $2)
       ON CONFLICT (patient_id, health_program_id) DO NOTHING
       RETURNING *`,
      [patientId, programId]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({ error: 'Already enrolled in this program.' });
    }
    res.status(201).json({ enrollment: result.rows[0] });
  } catch (err) {
    console.error('Error enrolling in health program:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/health-programs/:id/enroll
exports.unenroll = async (req, res) => {
  try {
    const patientId = await getPatientId(req.user.id);
    if (!patientId) return res.status(403).json({ error: 'Patient record not found.' });

    const programId = req.params.id;

    const result = await db.query(
      'DELETE FROM patient_health_programs WHERE patient_id = $1 AND health_program_id = $2 RETURNING id',
      [patientId, programId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Not enrolled in this program.' });
    }
    res.json({ message: 'Unenrolled from program.' });
  } catch (err) {
    console.error('Error unenrolling from health program:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
