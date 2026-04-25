const pool = require('../../config/db');

// Urgency priority map (lower = higher priority)
const URGENCY_PRIORITY = { emergency: 1, urgent: 2, standard: 3, self_care: 4 };

// Classify symptoms against DB rules; returns highest-priority match
async function classifySymptoms(symptomsText) {
  const { rows: rules } = await pool.query(
    `SELECT * FROM triage_symptom_rules
     ORDER BY CASE urgency_level
       WHEN 'emergency' THEN 1
       WHEN 'urgent'    THEN 2
       WHEN 'standard'  THEN 3
       ELSE 4
     END`
  );

  const lower = symptomsText.toLowerCase();
  let best = null;

  for (const rule of rules) {
    const keywords = rule.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const matched = keywords.some(kw => lower.includes(kw));
    if (matched) {
      if (!best || URGENCY_PRIORITY[rule.urgency_level] < URGENCY_PRIORITY[best.urgency_level]) {
        best = rule;
      }
    }
  }

  if (!best) {
    return {
      urgency_level: 'standard',
      recommended_action: 'Schedule an appointment with your doctor within 24-48 hours.',
      recommended_department: 'General Practice'
    };
  }

  return {
    urgency_level: best.urgency_level,
    recommended_action: best.recommended_action,
    recommended_department: best.recommended_department
  };
}

async function getPatientByUserId(userId) {
  const { rows } = await pool.query('SELECT * FROM patients WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

async function getDoctorByUserId(userId) {
  const { rows } = await pool.query('SELECT * FROM doctors WHERE user_id = $1', [userId]);
  return rows[0] || null;
}

// POST /api/triage/assess
exports.assessTriage = async (req, res) => {
  try {
    const { symptoms } = req.body;

    const patient = await getPatientByUserId(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const result = await classifySymptoms(symptoms);
    const followUpRecommended = ['emergency', 'urgent'].includes(result.urgency_level);

    const { rows } = await pool.query(
      `INSERT INTO triage_sessions
         (patient_id, symptoms_text, urgency_level, recommended_action, recommended_department, follow_up_recommended)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [patient.id, symptoms, result.urgency_level, result.recommended_action, result.recommended_department, followUpRecommended]
    );
    const session = rows[0];

    if (followUpRecommended) {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7);
      await pool.query(
        `INSERT INTO follow_up_schedules (patient_id, triage_session_id, scheduled_date, notes, status)
         VALUES ($1, $2, $3, $4, 'pending')`,
        [
          patient.id,
          session.id,
          scheduledDate.toISOString().split('T')[0],
          `Auto-created follow-up from triage: ${result.urgency_level}`
        ]
      );
    }

    return res.status(201).json({ message: 'Triage assessment complete.', data: session });
  } catch (err) {
    console.error('[Triage] assessTriage error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/triage/history
exports.getTriageHistory = async (req, res) => {
  try {
    const patient = await getPatientByUserId(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const { rows } = await pool.query(
      'SELECT * FROM triage_sessions WHERE patient_id = $1 ORDER BY created_at DESC',
      [patient.id]
    );
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('[Triage] getTriageHistory error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/triage/session/:id
exports.getTriageSession = async (req, res) => {
  try {
    const patient = await getPatientByUserId(req.user.id);
    if (!patient) return res.status(404).json({ error: 'Patient profile not found.' });

    const { rows } = await pool.query('SELECT * FROM triage_sessions WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Session not found.' });

    const session = rows[0];
    if (session.patient_id !== patient.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    return res.status(200).json({ data: session });
  } catch (err) {
    console.error('[Triage] getTriageSession error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PUT /api/triage/session/:id/escalate
exports.escalateSession = async (req, res) => {
  try {
    const { doctor_id } = req.body;
    if (!doctor_id || isNaN(parseInt(doctor_id))) {
      return res.status(400).json({ error: 'Valid doctor_id is required.' });
    }

    const doctorCheck = await pool.query('SELECT id FROM doctors WHERE id = $1', [parseInt(doctor_id)]);
    if (!doctorCheck.rowCount) return res.status(404).json({ error: 'Doctor not found.' });

    const { rows, rowCount } = await pool.query(
      'UPDATE triage_sessions SET escalated_to_doctor_id = $1 WHERE id = $2 RETURNING *',
      [parseInt(doctor_id), req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Session not found.' });

    return res.status(200).json({ message: 'Session escalated.', data: rows[0] });
  } catch (err) {
    console.error('[Triage] escalateSession error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/triage/escalated
exports.getEscalatedSessions = async (req, res) => {
  try {
    const doctor = await getDoctorByUserId(req.user.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found.' });

    const { rows } = await pool.query(
      `SELECT ts.*, u.full_name AS patient_name
       FROM triage_sessions ts
       JOIN patients p ON ts.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE ts.escalated_to_doctor_id = $1
       ORDER BY ts.created_at DESC`,
      [doctor.id]
    );
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('[Triage] getEscalatedSessions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/triage/admin/sessions
exports.getAdminSessions = async (req, res) => {
  try {
    const { urgency_level, date_from, date_to } = req.query;
    const conditions = [];
    const params = [];

    if (urgency_level) {
      params.push(urgency_level);
      conditions.push(`ts.urgency_level = $${params.length}`);
    }
    if (date_from) {
      params.push(date_from);
      conditions.push(`ts.created_at >= $${params.length}::date`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`ts.created_at < ($${params.length}::date + interval '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT ts.*, u.full_name AS patient_name
       FROM triage_sessions ts
       JOIN patients p ON ts.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       ${where}
       ORDER BY ts.created_at DESC`,
      params
    );
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('[Triage] getAdminSessions error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// POST /api/triage/rules
exports.createRule = async (req, res) => {
  try {
    const { urgency_level, keywords, recommended_action, recommended_department } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO triage_symptom_rules (urgency_level, keywords, recommended_action, recommended_department)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [urgency_level, keywords.trim(), recommended_action.trim(), recommended_department.trim()]
    );
    return res.status(201).json({ message: 'Rule created.', data: rows[0] });
  } catch (err) {
    console.error('[Triage] createRule error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// GET /api/triage/rules
exports.getRules = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM triage_symptom_rules ORDER BY id');
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error('[Triage] getRules error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// PUT /api/triage/rules/:id
exports.updateRule = async (req, res) => {
  try {
    const { urgency_level, keywords, recommended_action, recommended_department } = req.body;
    const { rows, rowCount } = await pool.query(
      `UPDATE triage_symptom_rules
       SET urgency_level       = COALESCE($1, urgency_level),
           keywords             = COALESCE($2, keywords),
           recommended_action   = COALESCE($3, recommended_action),
           recommended_department = COALESCE($4, recommended_department),
           updated_at           = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        urgency_level || null,
        keywords != null ? keywords.trim() : null,
        recommended_action != null ? recommended_action.trim() : null,
        recommended_department != null ? recommended_department.trim() : null,
        req.params.id
      ]
    );
    if (!rowCount) return res.status(404).json({ error: 'Rule not found.' });
    return res.status(200).json({ message: 'Rule updated.', data: rows[0] });
  } catch (err) {
    console.error('[Triage] updateRule error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

// DELETE /api/triage/rules/:id
exports.deleteRule = async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM triage_symptom_rules WHERE id = $1',
      [req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Rule not found.' });
    return res.status(200).json({ message: 'Rule deleted.' });
  } catch (err) {
    console.error('[Triage] deleteRule error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
