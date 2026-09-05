// File: src/controllers/questions/questionsController.js

const db = require('../../config/db');
const paginage = require('../../utils/pagination');

exports.getPublicQuestions = async (req, res) => {
  try {
    const { specialty, author, approval } = req.query;

    const result = await paginage({
      table: 'question_bank',
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 10,
      sort: req.query.sort || '+id',
      sortTable: 'q',
      join: `
        AS q
        LEFT JOIN doctors d ON q.suggested_by = d.id
        LEFT JOIN users duser ON d.user_id = duser.id
      `,
      select:`
        q.*, duser.full_name AS doctor_name
      `,
      filters: {
        "q.question_type": 'public',
        "q.specialty": specialty,
        "duser.full_name": author,
        "q.is_approved": approval
      }
    });

    res.json(result);
  } catch (err) {
    console.error('[getPublicQuestions]', err.message);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
};

exports.getSpecialtyQuestions = async (req, res) => {
  const { specialty } = req.params;
  try {
    const result = await db.query(
      "SELECT * FROM question_bank WHERE question_type = 'specialty' AND specialty = $1 ORDER BY id",
      [specialty]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

async function resolveOwnPatientId(userId) {
  const r = await db.query('SELECT id FROM patients WHERE user_id = $1', [userId]);
  return r.rows[0]?.id ?? null;
}

// Links a freshly-submitted response back to a pending doctor-assigned question
// for the same patient+question, if one exists, so the assignment shows as answered.
async function linkAssignmentToResponse(patientId, questionId, responseId) {
  await db.query(
    `UPDATE question_assignments SET response_id = $1
     WHERE patient_id = $2 AND question_id = $3 AND response_id IS NULL`,
    [responseId, patientId, questionId]
  );
}

exports.submitAnswer = async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can submit answers' });
  }

  const { question_id, answer } = req.body;

  if (!question_id || !answer) {
    return res.status(400).json({ error: 'question_id and answer are required.' });
  }

  try {
    const patientId = await resolveOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ error: 'Patient not found.' });

    const result = await db.query(
      `INSERT INTO patient_question_responses (patient_id, question_id, answer)
       VALUES ($1, $2, $3) RETURNING id`,
      [patientId, question_id, answer]
    );
    await linkAssignmentToResponse(patientId, question_id, result.rows[0].id);

    res.status(201).json({ message: 'Answer submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.submitBulkAnswers = async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can submit answers' });
  }

  const { answers } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Invalid request body.' });
  }

  try {
    const patientId = await resolveOwnPatientId(req.user.id);
    if (!patientId) return res.status(404).json({ error: 'Patient not found.' });

    const queryText = `INSERT INTO patient_question_responses (patient_id, question_id, answer) VALUES ` +
      answers.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(',') +
      ' RETURNING id, question_id';
    const values = [patientId, ...answers.flatMap(a => [a.question_id, a.answer])];

    const inserted = await db.query(queryText, values);
    for (const row of inserted.rows) {
      await linkAssignmentToResponse(patientId, row.question_id, row.id);
    }

    res.status(201).json({ message: 'Answers submitted successfully' });
  } catch (err) {
    console.error('[submitBulkAnswers] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getResponsesByPatient = async (req, res) => {
  let patientIdToUse;

  try {
    if (req.user.role === 'patient') {
      // Force use of own patient ID
      const result = await db.query(
        'SELECT id FROM patients WHERE user_id = $1',
        [req.user.id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Patient not found.' });
      }

      const ownPatientId = result.rows[0].id;
      const requestedPatientId = parseInt(req.params.patientId, 10);

      // Compare requestedPatientId (from URL) against ownPatientId.
      if (!ownPatientId || requestedPatientId !== ownPatientId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own responses.' });
      }

      patientIdToUse = ownPatientId;

    } else if (req.user.role === 'doctor') {
      const doctorResult = await db.query(
        'SELECT id FROM doctors WHERE user_id = $1',
        [req.user.id]
      );

      if (doctorResult.rowCount === 0) {
        return res.status(403).json({ error: 'Doctor not registered' });
      }

      const doctorId = doctorResult.rows[0].id;
      const { patientId } = req.params;

      const assignmentCheck = await db.query(
        'SELECT 1 FROM appointments WHERE patient_id = $1 AND doctor_id = $2 LIMIT 1',
        [patientId, doctorId]
      );

      if (assignmentCheck.rowCount === 0) {
        return res.status(403).json({ error: 'You are not assigned to this patient.' });
      }

      // Doctor is allowed to see this patient’s data
      patientIdToUse = patientId;

    } else {
      return res.status(403).json({ error: 'Unauthorized role' });
    }

    // Finally fetch that patient’s responses
    const result = await db.query(
      `SELECT r.id AS response_id, 
              q.question_text, 
              r.answer, 
              r.created_at,
              n.note, 
              n.created_at AS note_created_at
       FROM patient_question_responses r
       JOIN question_bank q ON r.question_id = q.id
       LEFT JOIN doctor_response_notes n ON r.id = n.response_id
       WHERE r.patient_id = $1
       ORDER BY r.created_at DESC`,
      [patientIdToUse]
    );

    return res.status(200).json(result.rows || []);

  } catch (err) {
    console.error('[getResponsesByPatient] Unexpected Error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.addNoteToResponse = async (req, res) => {
  const { doctor_id, response_id, note } = req.body;
  try {
    await db.query(
      `INSERT INTO doctor_response_notes (doctor_id, response_id, note)
       VALUES ($1, $2, $3)`,
      [doctor_id, response_id, note]
    );
    res.status(201).json({ message: 'Note added to response' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.suggestSpecialtyQuestion = async (req, res) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Only doctors can suggest questions' });
  }

  const { question_text, specialty } = req.body;

  try {
    const doctorResult = await db.query(
      'SELECT id FROM doctors WHERE user_id = $1',
      [req.user.id]
    );

    if (doctorResult.rowCount === 0) {
      return res.status(403).json({ error: 'Doctor not registered' });
    }

    const doctorId = doctorResult.rows[0].id;

    await db.query(
      `INSERT INTO question_bank (question_text, question_type, specialty, suggested_by, is_approved)
       VALUES ($1, 'specialty', $2, $3, FALSE)`,
      [question_text, specialty, doctorId]
    );

    res.status(201).json({ message: 'Question suggestion submitted for approval' });
  } catch (err) {
    console.error('[suggestSpecialtyQuestion]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getMyResponses = async (req, res) => {
  try {
    // Only allow patients
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Find this user’s patient_id
    const patientRow = await db.query(
      'SELECT id FROM patients WHERE user_id = $1',
      [req.user.id]
    );
    if (patientRow.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    const patientId = patientRow.rows[0].id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [dataRes, countRes] = await Promise.all([
      db.query(
        `SELECT
           r.id           AS response_id,
           q.question_text,
           r.answer,
           r.created_at,
           n.note,
           n.created_at   AS note_created_at
         FROM patient_question_responses r
         JOIN question_bank q ON r.question_id = q.id
         LEFT JOIN doctor_response_notes n ON r.id = n.response_id
         WHERE r.patient_id = $1
         ORDER BY r.created_at DESC
         LIMIT $2 OFFSET $3`,
        [patientId, limit, offset]
      ),
      db.query('SELECT COUNT(*) FROM patient_question_responses WHERE patient_id = $1', [patientId]),
    ]);
    const total = parseInt(countRes.rows[0].count);

    return res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      totalItems: total,
      data: dataRes.rows,
    });

  } catch (err) {
    console.error('[getMyResponses] Error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getResponsesForLoggedInPatient = async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query('SELECT id FROM patients WHERE user_id = $1', [req.user.id]);
    const patientId = result.rows[0]?.id;

    if (!patientId) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const responses = await db.query(
      `SELECT r.id AS response_id,
              q.question_text,
              r.answer,
              r.created_at,
              n.note,
              n.created_at AS note_created_at
       FROM patient_question_responses r
       JOIN question_bank q ON r.question_id = q.id
       LEFT JOIN doctor_response_notes n ON r.id = n.response_id
       WHERE r.patient_id = $1
       ORDER BY r.created_at DESC`,
      [patientId]
    );

    return res.status(200).json(responses.rows || []);
  } catch (err) {
    console.error('[getResponsesForLoggedInPatient] Error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Doctor: get all question responses from their linked patients
exports.getDoctorPatientResponses = async (req, res) => {
  try {
    const doctorResult = await db.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
    if (doctorResult.rowCount === 0) return res.status(404).json({ error: 'Doctor not found.' });
    const doctorId = doctorResult.rows[0].id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const where = `WHERE p.id IN (SELECT DISTINCT patient_id FROM appointments WHERE doctor_id = $1)`;

    const countRes = await db.query(
      `SELECT COUNT(*) FROM patient_question_responses r
       JOIN patients p ON r.patient_id = p.id
       ${where}`,
      [doctorId]
    );
    const total = parseInt(countRes.rows[0].count);

    const responses = await db.query(
      `SELECT
         r.id, r.patient_id, r.question_id, r.answer, r.created_at,
         u.full_name AS patient_name,
         q.question_text
       FROM patient_question_responses r
       JOIN patients p ON r.patient_id = p.id
       JOIN users u ON p.user_id = u.id
       JOIN question_bank q ON r.question_id = q.id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [doctorId, limit, offset]
    );

    res.json({
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      pageSize: limit,
      totalItems: total,
      data: responses.rows,
    });
  } catch (err) {
    console.error('[getDoctorPatientResponses]', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
