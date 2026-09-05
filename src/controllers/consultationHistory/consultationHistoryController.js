const pool = require('../../config/db');
const { decrypt } = require('../../utils/encrypt');

const VALID_TYPES = ['triage', 'appointment', 'prescription', 'medical_record', 'follow_up', 'health_log'];

async function resolvePatientId(pool, userId) {
  const r = await pool.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return r.rows[0]?.id ?? null;
}

async function resolveDoctorId(pool, userId) {
  const r = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
  return r.rows[0]?.id ?? null;
}

async function authCheck(req, patientId) {
  const { role, id: userId } = req.user;
  if (role === 'admin') return true;

  if (role === 'patient') {
    const myPatientId = await resolvePatientId(pool, userId);
    return myPatientId !== null && myPatientId === parseInt(patientId);
  }

  if (role === 'doctor') {
    const doctorId = await resolveDoctorId(pool, userId);
    if (!doctorId) return false;
    const r = await pool.query(
      'SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1',
      [doctorId, patientId]
    );
    return r.rows.length > 0;
  }

  return false;
}

exports.getTimeline = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { type, date_from, date_to } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const exists = await pool.query('SELECT 1 FROM patients WHERE id = $1', [patientId]);
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Patient not found.' });

    const allowed = await authCheck(req, patientId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    const requestedTypes = type
      ? type.split(',').map(t => t.trim()).filter(t => VALID_TYPES.includes(t))
      : VALID_TYPES;

    if (requestedTypes.length === 0) return res.json({ data: [], total: 0, limit, offset });

    const params = [];
    let pi = 1;

    function addParam(val) { params.push(val); return pi++; }

    function dateFilter(col) {
      let f = '';
      if (date_from) f += ` AND ${col} >= $${addParam(date_from)}`;
      if (date_to)   f += ` AND ${col} <= $${addParam(date_to)}`;
      return f;
    }

    const parts = [];

    if (requestedTypes.includes('triage')) {
      const p = addParam(patientId);
      parts.push(`
        SELECT 'triage' AS type, id, created_at AS date,
          urgency_level AS summary,
          jsonb_build_object(
            'urgency_level', urgency_level,
            'recommended_action', recommended_action,
            'recommended_department', recommended_department,
            'follow_up_recommended', follow_up_recommended
          ) AS details
        FROM triage_sessions
        WHERE patient_id = $${p}${dateFilter('created_at')}
      `);
    }

    if (requestedTypes.includes('appointment')) {
      const p = addParam(patientId);
      parts.push(`
        SELECT 'appointment' AS type, id, (appointment_date::timestamp) AS date,
          status AS summary,
          jsonb_build_object(
            'status', status,
            'appointment_date', appointment_date,
            'appointment_start_time', appointment_start_time,
            'appointment_end_time', appointment_end_time,
            'notes', notes,
            'doctor_id', doctor_id,
            'appointment_type', appointment_type
          ) AS details
        FROM appointments
        WHERE patient_id = $${p} AND appointment_type IN ('consultation', 'triage_escalation')${dateFilter('appointment_date::timestamp')}
      `);
    }

    if (requestedTypes.includes('prescription')) {
      const p = addParam(patientId);
      parts.push(`
        SELECT 'prescription' AS type, pr.id, (pr.issued_date::timestamp) AS date,
          m.name AS summary,
          jsonb_build_object(
            'medication', m.name,
            'dosage', pr.dosage,
            'pack_limit', pr.pack_limit,
            'instructions', pr.instructions,
            'issued_date', pr.issued_date
          ) AS details
        FROM prescriptions pr
        JOIN appointments a ON pr.appointment_id = a.id
        JOIN medications m ON pr.medication_id = m.id
        WHERE a.patient_id = $${p}${dateFilter('pr.issued_date::timestamp')}
      `);
    }

    if (requestedTypes.includes('medical_record')) {
      const p = addParam(patientId);
      parts.push(`
        SELECT 'medical_record' AS type, id, created_at AS date,
          record_type AS summary,
          jsonb_build_object(
            'record_type', record_type,
            'description', description,
            'file_url', file_url
          ) AS details
        FROM medical_records
        WHERE patient_id = $${p}${dateFilter('created_at')}
      `);
    }

    if (requestedTypes.includes('follow_up')) {
      const p = addParam(patientId);
      parts.push(`
        SELECT 'follow_up' AS type, id, (appointment_date::timestamp) AS date,
          COALESCE(notes, status) AS summary,
          jsonb_build_object(
            'status', status,
            'notes', notes,
            'scheduled_date', appointment_date,
            'doctor_id', doctor_id,
            'reminder_sent', reminder_sent
          ) AS details
        FROM appointments
        WHERE patient_id = $${p} AND appointment_type = 'follow_up'${dateFilter('appointment_date::timestamp')}
      `);
    }

    if (requestedTypes.includes('health_log')) {
      const p = addParam(patientId);
      parts.push(`
        SELECT 'health_log' AS type, id, logged_at AS date,
          log_type AS summary,
          jsonb_build_object(
            'log_type', log_type,
            'notes', notes,
            'data', data
          ) AS details
        FROM health_logs
        WHERE patient_id = $${p}${dateFilter('logged_at')}
      `);
    }

    const union = parts.join('\nUNION ALL\n');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM (${union}) AS t`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const limitParam  = addParam(limit);
    const offsetParam = addParam(offset);
    // type/id break ties deterministically when multiple entries share the
    // same timestamp (e.g. a batch of auto-created follow-ups) — without a
    // tiebreaker, LIMIT/OFFSET pagination over tied rows isn't guaranteed to
    // return a stable order, so the same row can reappear or get skipped
    // across pages.
    const dataResult = await pool.query(
      `SELECT * FROM (${union}) AS t ORDER BY date DESC NULLS LAST, type, id LIMIT $${limitParam} OFFSET $${offsetParam}`,
      params
    );

    const data = dataResult.rows.map(row => {
      if (row.type === 'prescription' && row.details) {
        return {
          ...row,
          // Only instructions is ever encrypted — medication is a plain
          // medications.name lookup, never ciphertext.
          details: {
            ...row.details,
            instructions: decrypt(row.details.instructions),
          },
        };
      }
      return row;
    });

    res.json({ data, total, limit, offset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    const exists = await pool.query('SELECT 1 FROM patients WHERE id = $1', [patientId]);
    if (exists.rows.length === 0) return res.status(404).json({ error: 'Patient not found.' });

    const allowed = await authCheck(req, patientId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    const [triage, appointments, prescriptions, medRecords, followUps, healthLogs] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM triage_sessions WHERE patient_id = $1', [patientId]),
      pool.query("SELECT COUNT(*) FROM appointments WHERE patient_id = $1 AND appointment_type IN ('consultation', 'triage_escalation')", [patientId]),
      pool.query(
        'SELECT COUNT(*) FROM prescriptions pr JOIN appointments a ON pr.appointment_id = a.id WHERE a.patient_id = $1',
        [patientId]
      ),
      pool.query('SELECT COUNT(*) FROM medical_records WHERE patient_id = $1', [patientId]),
      pool.query("SELECT COUNT(*) FROM appointments WHERE patient_id = $1 AND appointment_type = 'follow_up'", [patientId]),
      pool.query('SELECT COUNT(*) FROM health_logs WHERE patient_id = $1', [patientId]),
    ]);

    res.json({
      triage:          parseInt(triage.rows[0].count),
      appointments:    parseInt(appointments.rows[0].count),
      prescriptions:   parseInt(prescriptions.rows[0].count),
      medical_records: parseInt(medRecords.rows[0].count),
      follow_ups:      parseInt(followUps.rows[0].count),
      health_logs:     parseInt(healthLogs.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
