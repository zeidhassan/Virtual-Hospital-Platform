// src/utils/pagination.js
// Pagination utility for PostgreSQL with validation and error handling
// This utility allows for pagination of any table with sorting and filtering capabilities.

const pool = require('../config/db');

const VALID_SORT_COLUMNS = {
  users: ['id', 'full_name', 'email', 'password_hash', 'role', 'phone', 'gender', 'date_of_birth', 'profile_picture_url', 'login_attempts', 'locked_until', 'created_at', 'updated_at'],
  doctors: ['id', 'user_id', 'specialization', 'qualifications', 'availability_status', 'profile_picture_url', 'bio'],
  patients: ['id', 'user_id', 'blood_group', 'emergency_contact_name', 'emergency_contact_phone', 'address', 'allergies', 'chronic_conditions'],
  appointments: ['id', 'patient_id', 'doctor_id', 'appointment_date', 'appointment_start_time', 'appointment_end_time', 'status', 'notes', 'appointment_type', 'triage_session_id', 'reminder_sent', 'completed_at', 'created_by'],
  doctor_time_slots: ['id', 'doctor_id', 'day_of_week', 'start_time', 'end_time'],
  appointment_status_logs: ['id', 'appointment_id', 'old_status', 'new_status', 'changed_at'],
  prescriptions: ['id', 'appointment_id', 'medication_id', 'dosage', 'instructions', 'issued_date', 'refills_used', 'pack_limit', 'limit_reached'],
  medical_records: ['id', 'patient_id', 'doctor_id', 'appointment_id', 'record_type', 'description', 'file_url', 'created_at', 'private'],
  bills: ['id', 'patient_id', 'amount', 'status', 'billing_date', 'details', 'currency', 'pharmacy_order_id'],
  plans: ['id', 'name', 'description', 'price', 'duration_days', 'features', 'currency'],
  subscriptions: ['id', 'patient_id', 'plan_name', 'start_date', 'end_date', 'auto_renew', 'status'],
  messages: ['id', 'conversation_id', 'sender_id', 'message', 'attachment_url', 'attachment_type', 'created_at'],
  notifications: ['id', 'user_id', 'title', 'body', 'is_read', 'type', 'category', 'actor_name', 'actor_role', 'created_at'],
  medications: ['id', 'name', 'type', 'description', 'price', 'photo_url'],
  pharmacy_orders: ['id', 'patient_id', 'prescription_id', 'medications', 'quantities', 'total_amount', 'currency', 'status', 'prescription_file', 'delivery_address', 'payment_method', 'insurance_request_id', 'ordered_at'],
  question_bank: ['id', 'question_text', 'question_type', 'specialty', 'suggested_by', 'is_approved', 'created_at'],
  patient_question_responses: ['id', 'patient_id', 'question_id', 'answer', 'created_at'],
  doctor_response_notes: ['id', 'doctor_id', 'response_id', 'note', 'created_at'],
  doctor_plans: ['id', 'name', 'description', 'monthly_price', 'yearly_price', 'features', 'currency', 'created_at'],
  doctor_subscriptions: ['id', 'user_id', 'plan_id', 'billing_cycle', 'status', 'paperwork_url', 'start_date', 'end_date', 'admin_notes', 'created_at', 'updated_at'],
  insurance_requests: ['id', 'patient_id', 'doctor_id', 'bill_id', 'insurance_company', 'insurance_id_number', 'start_date', 'end_date', 'status', 'reviewed_by', 'created_at'],
  support_tickets: ['id', 'user_id', 'category', 'subject', 'description', 'status', 'file_url', 'doctor_assigned', 'patient_assigned', 'created_at', 'updated_at', 'admin_read_at'],
  support_ticket_replies: ['id', 'ticket_id', 'user_id', 'message', 'file_url', 'created_at'],
  services: ['id', 'name', 'description', 'cost'],
  health_programs: ['id', 'name', 'description', 'start_date', 'end_date', 'eligibility'],
  health_logs: ['id', 'patient_id', 'log_type', 'data', 'notes', 'logged_at'],
  triage_sessions: ['id', 'patient_id', 'symptoms_text', 'urgency_level', 'recommended_action', 'recommended_department', 'follow_up_recommended', 'escalated_to_doctor_id', 'created_at'],
  triage_symptom_rules: ['id', 'urgency_level', 'keywords', 'recommended_action', 'recommended_department', 'created_at', 'updated_at'],
  patient_insurance: ['id', 'patient_id', 'insurance_company', 'insurance_id_number', 'start_date', 'end_date', 'is_active', 'created_at', 'updated_at'],
  payment_methods: ['id', 'user_id', 'provider', 'cardholder_name', 'brand', 'last4', 'exp_month', 'exp_year', 'status', 'is_default', 'created_at', 'updated_at'],
  payment_transactions: ['id', 'user_id', 'bill_id', 'doctor_subscription_id', 'amount', 'currency', 'method_type', 'fpx_bank', 'payment_method_id', 'transaction_ref', 'status', 'created_at'],
  billing_addresses: ['id', 'user_id', 'addr_type', 'first_name', 'last_name', 'line1', 'line2', 'city', 'region', 'postal_code', 'country_code', 'email', 'phone', 'is_default', 'created_at', 'updated_at'],
  conversations: ['id', 'title', 'is_group', 'created_by', 'created_at', 'updated_at'],
  conversation_participants: ['id', 'conversation_id', 'user_id', 'joined_at', 'last_read_at', 'is_pinned'],
  question_assignments: ['id', 'question_id', 'patient_id', 'doctor_id', 'response_id', 'assigned_at'],
};

module.exports = async function paginate({
  table,
  page = 1,
  limit = 10,
  sort = '+id',
  join = '',
  select = '*',
  sortTable = null,
  filters = {}
}) {
  const pageInt = parseInt(page) || 1;
  const limitINT = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitINT;

  // Accept table alias by stripping after first space (e.g., 'appointments a' => 'appointments')
  const baseTable = table.split(' ')[0]; // gets the base table name before any alias

  if (!VALID_SORT_COLUMNS.hasOwnProperty(baseTable)) {
    console.warn(`[Pagination] Invalid table: ${table}`);
    throw new Error(`Invalid table: ${table}`);
  }

  // Parse sort param
  const direction = sort.startsWith('-') ? 'DESC' : 'ASC';
  const column = sort.replace(/^[-+]/, '').trim();

  // Use baseTable for sort column validation
  if (!VALID_SORT_COLUMNS[baseTable].includes(column)) {
    console.warn(`[Pagination] Invalid sort column: ${column}`);
    throw new Error(`Invalid sort column '${column}' for table '${baseTable}'`);
  }

  const prefix = sortTable || table; // Use table name as prefix if sortTable is not provided

  // Validate alias prefix (if given)
  const validSortRegex = /^[a-zA-Z0-9_]+$/;
  if (prefix && !validSortRegex.test(prefix)) {
    throw new Error(`Invalid sort table/alias: ${prefix}`);
  }

  // Build dynamic WHERE clause from filters
  let whereClause = '';
  const queryParams = [];

  // Filter keys are interpolated directly into the query below, so every key
  // must look like a plain column name or an "alias.column" pair — nothing
  // else. This doesn't check the key belongs to any particular table (many
  // callers legitimately filter on a joined table's column), it just makes
  // sure a key can never be a SQL fragment — the thing that would turn
  // `filters: { ...req.query }` into an injection instead of a bad filter.
  const SAFE_FILTER_KEY = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;

  if (filters && typeof filters === 'object') {
    const conditions = [];

    Object.entries(filters).forEach(([column, value]) => {
      if (value !== undefined && value !== '' && !SAFE_FILTER_KEY.test(column)) {
        throw new Error(`Invalid filter key: ${column}`);
      }
      if (value !== undefined && value !== '') {
        if (value === "true" || value === "false") {
          // Handle boolean values
          queryParams.push(value);
          conditions.push(`${column} = $${queryParams.length}`);

        } else if (typeof value === 'string' && isNaN(Date.parse(value))) {
          // Handle string input with case-insensitive LIKE
          queryParams.push(`%${value.toLowerCase()}%`);
          conditions.push(`LOWER(${column}) LIKE LOWER($${queryParams.length})`);
        } else {
          // Handle date and number with exact match
          queryParams.push(value);
          conditions.push(`${column} = $${queryParams.length}`);
        }
      }
    });

    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
  }

  try {
    const limitParamIndex = queryParams.length + 1;
    const offsetParamIndex = queryParams.length + 2;

    const dataQuery = `
      SELECT ${select}
      FROM ${table}
      ${join}
      ${whereClause}
      ORDER BY ${prefix}.${column} ${direction}
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    let countQuery;

    if (/^DISTINCT\s+ON\s*\(\s*([^)]+)\s*\)/i.test(select.trim())) {
      const distinctColMatch = select.trim().match(/^DISTINCT\s+ON\s*\(\s*([^)]+)\s*\)/i);
      const distinctCol = distinctColMatch[1];

      countQuery = `
        SELECT COUNT(DISTINCT ${distinctCol}) AS total
        FROM ${table}
        ${join}
        ${whereClause}
      `;
    } else {
      countQuery = `
        SELECT COUNT(*) AS total
        FROM ${table}
        ${join}
        ${whereClause}
      `;
    }

    const dataResult = await pool.query(dataQuery, [...queryParams, limitINT, offset]);
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    return {
      currentPage: pageInt,
      totalPages: Math.ceil(total / limitINT),
      pageSize: limitINT,
      totalItems: total,
      data: dataResult.rows
    };
  } catch (err) {
    throw new Error(`Pagination error: ${err.message}`);
  }
};

/**
 * PostgreSQL Pagination Utility
 *
 * This utility enables paginated, sorted, and filtered queries on any table in the database.
 * It supports joining related tables, selecting specific columns, and dynamic filtering.
 *
 * Usage example:
 *
 * const result = await paginate({
 *   table: 'appointments',             // Target table
 *   page: 2,                           // Page number (default = 1)
 *   limit: 5,                          // Items per page (default = 10)
 *   sort: '-appointment_date',         // Sort by column (prefix with "-" for DESC, "+" or no prefix for ASC)
 *   sortTable: 'a',                    // Optional alias for sorting if join is used
 *   select: 'a.*, u.full_name',        // Columns to select (with optional join fields)
 *   join: 'JOIN users u ON a.patient_id = u.id', // JOIN clause if needed
 *   filters: {
 *     'a.doctor_id': 3,                // Exact match (number)
 *     'u.full_name': 'john',           // Case-insensitive partial match (string)
 *     'a.status': 'completed',         // Exact match (string or boolean)
 *     'a.appointment_date': '2025-07-31' // Date match (string or Date)
 *   }
 * });
 *
 * Returns:
 * {
 *   currentPage: 2,
 *   totalPages: 5,
 *   pageSize: 5,
 *   totalItems: 22,
 *   data: [ ...rows ]
 * }
 *
 * Notes:
 * - `filters` keys should match actual SQL column names or their aliases.
 * - Table name must exist in VALID_SORT_COLUMNS for safety.
 * - Filtering supports partial matching (LIKE) for strings, and exact match for numbers/booleans/dates.
 */
