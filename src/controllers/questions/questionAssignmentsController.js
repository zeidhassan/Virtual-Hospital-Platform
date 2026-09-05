// Lets a doctor hand specific health-bank questions to a specific patient,
// instead of the patient only ever browsing the general public pool.
const pool = require('../../config/db');

// POST /api/question-assignments — doctor assigns one or more bank questions to a
// patient, and/or writes their own custom questions on the spot. A custom question
// is added to the shared bank (type 'specialty', pre-approved since a doctor is
// assigning it directly to their own patient) so it's immediately usable and can
// be reused later — unlike the general "suggest a question" flow, which still
// requires admin approval before anyone can be assigned it.
exports.assignQuestions = async (req, res) => {
  try {
    const { patient_id, question_ids = [], custom_questions = [] } = req.body;
    const cleanCustom = custom_questions.map((t) => (t || '').trim()).filter(Boolean);

    if (!patient_id || (question_ids.length === 0 && cleanCustom.length === 0)) {
      return res.status(400).json({ error: 'patient_id and at least one question (from the bank or custom) are required.' });
    }

    const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (doctorRow.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }
    const doctorId = doctorRow.rows[0].id;

    const linkCheck = await pool.query(
      'SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1',
      [doctorId, patient_id]
    );
    if (linkCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not linked to this patient.' });
    }

    let validIds = [];
    if (question_ids.length > 0) {
      const questionsRes = await pool.query(
        `SELECT id FROM question_bank WHERE id = ANY($1) AND is_approved = TRUE`,
        [question_ids]
      );
      validIds = questionsRes.rows.map((r) => r.id);
    }

    if (cleanCustom.length > 0) {
      const specialtyRow = await pool.query('SELECT specialization FROM doctors WHERE id = $1', [doctorId]);
      const specialty = specialtyRow.rows[0]?.specialization || null;
      const customRes = await pool.query(
        `INSERT INTO question_bank (question_text, question_type, specialty, suggested_by, is_approved)
         SELECT unnest($1::text[]), 'specialty', $2, $3, TRUE
         RETURNING id`,
        [cleanCustom, specialty, doctorId]
      );
      validIds.push(...customRes.rows.map((r) => r.id));
    }

    if (validIds.length === 0) {
      return res.status(400).json({ error: 'None of the given questions are valid, approved bank questions.' });
    }

    // Skip questions already assigned-and-unanswered for this patient, to avoid duplicate spam.
    const existingRes = await pool.query(
      `SELECT question_id FROM question_assignments WHERE patient_id = $1 AND question_id = ANY($2) AND response_id IS NULL`,
      [patient_id, validIds]
    );
    const alreadyPending = new Set(existingRes.rows.map((r) => r.question_id));
    const toInsert = validIds.filter((qid) => !alreadyPending.has(qid));

    if (toInsert.length === 0) {
      return res.status(400).json({ error: 'All selected questions are already assigned and awaiting an answer.' });
    }

    const values = toInsert.map((_, i) => `($1, $${i + 2}, $${toInsert.length + 2})`).join(',');
    await pool.query(
      `INSERT INTO question_assignments (patient_id, question_id, doctor_id) VALUES ${values}`,
      [patient_id, ...toInsert, doctorId]
    );

    const patientUser = await pool.query('SELECT user_id FROM patients WHERE id = $1', [patient_id]);
    if (patientUser.rows.length > 0) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, body, category) VALUES ($1, $2, $3, 'system')`,
        [patientUser.rows[0].user_id, 'New Health Questions', `Your doctor has sent you ${toInsert.length} new health question${toInsert.length !== 1 ? 's' : ''} to answer.`]
      );
    }

    res.status(201).json({ message: `${toInsert.length} question(s) assigned.`, assigned: toInsert.length, skipped: validIds.length - toInsert.length });
  } catch (err) {
    console.error('[assignQuestions]', err);
    res.status(500).json({ error: 'Server error while assigning questions.' });
  }
};

// GET /api/question-assignments/my — patient views questions assigned to them
exports.getMyAssignments = async (req, res) => {
  try {
    const patientRow = await pool.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    if (patientRow.rows.length === 0) {
      return res.status(404).json({ error: 'Patient profile not found.' });
    }
    const patientId = patientRow.rows[0].id;

    const result = await pool.query(
      `SELECT qa.id, qa.question_id, qa.response_id, qa.assigned_at,
              qb.question_text, du.full_name AS doctor_name,
              r.answer, r.created_at AS answered_at
       FROM question_assignments qa
       JOIN question_bank qb ON qa.question_id = qb.id
       JOIN doctors d ON qa.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       LEFT JOIN patient_question_responses r ON qa.response_id = r.id
       WHERE qa.patient_id = $1
       ORDER BY qa.response_id IS NULL DESC, qa.assigned_at DESC`,
      [patientId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('[getMyAssignments]', err);
    res.status(500).json({ error: 'Server error while fetching assignments.' });
  }
};

// GET /api/question-assignments/patient/:patientId — doctor views what they've assigned to one patient
exports.getAssignmentsForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const doctorRow = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (doctorRow.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor profile not found.' });
    }
    const doctorId = doctorRow.rows[0].id;

    const linkCheck = await pool.query(
      'SELECT 1 FROM appointments WHERE doctor_id = $1 AND patient_id = $2 LIMIT 1',
      [doctorId, patientId]
    );
    if (linkCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not linked to this patient.' });
    }

    const result = await pool.query(
      `SELECT qa.id, qa.question_id, qa.response_id, qa.assigned_at,
              qb.question_text, r.answer, r.created_at AS answered_at
       FROM question_assignments qa
       JOIN question_bank qb ON qa.question_id = qb.id
       LEFT JOIN patient_question_responses r ON qa.response_id = r.id
       WHERE qa.patient_id = $1 AND qa.doctor_id = $2
       ORDER BY qa.assigned_at DESC`,
      [patientId, doctorId]
    );

    res.json({ data: result.rows });
  } catch (err) {
    console.error('[getAssignmentsForPatient]', err);
    res.status(500).json({ error: 'Server error while fetching assignments.' });
  }
};

// GET /api/question-assignments/admin — admin read-only overview of all assignments
exports.getAllAssignments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM question_assignments');
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT qa.id, qa.assigned_at, qa.response_id,
              qb.question_text,
              pu.full_name AS patient_name,
              du.full_name AS doctor_name,
              r.answer, r.created_at AS answered_at
       FROM question_assignments qa
       JOIN question_bank qb ON qa.question_id = qb.id
       JOIN patients p ON qa.patient_id = p.id
       JOIN users pu ON p.user_id = pu.id
       JOIN doctors d ON qa.doctor_id = d.id
       JOIN users du ON d.user_id = du.id
       LEFT JOIN patient_question_responses r ON qa.response_id = r.id
       ORDER BY qa.assigned_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      totalItems: total,
      data: result.rows,
    });
  } catch (err) {
    console.error('[getAllAssignments]', err);
    res.status(500).json({ error: 'Server error while fetching assignments.' });
  }
};
