// Update the authenticated user's profile (account info)
// PATCH /api/profile
// Body can include any subset of:
// { email, full_name, phone_number, country, region, city, zip_code, avatar_url }
const pool = require('../../config/db');

exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    // 1) Basic user info
    const { rows: urows } = await pool.query(
      `SELECT id, full_name, email, phone, gender, date_of_birth, role, created_at, updated_at
         FROM users
        WHERE id = $1`,
      [userId]
    );
    const user = urows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // 2) All addresses for the user (billing + shipping)
    const { rows: addrRows } = await pool.query(
      `SELECT id, addr_type, first_name, last_name, line1, line2, city, region,
              postal_code, country_code, email, phone, is_default, created_at, updated_at
         FROM billing_addresses
        WHERE user_id = $1
        ORDER BY is_default DESC, id ASC`,
      [userId]
    );

    // 3) All payment methods for the user
    const { rows: pmRows } = await pool.query(
      `SELECT id, provider, cardholder_name, brand, last4, exp_month, exp_year,
              paypal_payer_id, paypal_email, status, is_default, created_at, updated_at
         FROM payment_methods
        WHERE user_id = $1
        ORDER BY is_default DESC, id ASC`,
      [userId]
    );

    // 4) Compute defaults
    const defaultBilling   = addrRows.find(a => a.addr_type === 'billing'  && a.is_default) || null;
    const defaultShipping  = addrRows.find(a => a.addr_type === 'shipping' && a.is_default) || null;
    const defaultPayMethod = pmRows.find(p => p.is_default) || null;

    return res.json({
      user,
      addresses: addrRows,
      payment_methods: pmRows,
      defaults: {
        billing_address: defaultBilling,
        shipping_address: defaultShipping,
        payment_method: defaultPayMethod
      }
    });
  } catch (err) {
    console.error('[getMyProfile] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    // Accept these fields only (matching the users table)
    // Aliases: phone_number -> phone
    const body = req.body || {};
    const email        = body.email;
    const full_name    = body.full_name;
    const phone        = (body.phone !== undefined) ? body.phone : body.phone_number;
    const gender       = body.gender;
    const date_of_birth_input = body.date_of_birth;

    // Collect sanitized updates
    const updates = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // email
    if (email !== undefined) {
      const e = String(email).trim().toLowerCase();
      if (!emailRe.test(e)) {
        return res.status(400).json({ error: 'Invalid email address.' });
      }
      // uniqueness (exclude self)
      const dupeCheck = await pool.query(
        'SELECT 1 FROM users WHERE lower(email) = lower($1) AND id <> $2',
        [e, userId]
      );
      if (dupeCheck.rowCount > 0) {
        return res.status(409).json({ error: 'Email is already in use.' });
      }
      updates.email = e;
    }

    // full_name
    if (full_name !== undefined) {
      const name = String(full_name).trim();
      if (name.length < 2) {
        return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
      }
      if (name.length > 100) {
        return res.status(400).json({ error: 'Full name exceeds 100 characters.' });
      }
      updates.full_name = name;
    }

    // phone (stored in users.phone VARCHAR(20))
    if (phone !== undefined) {
      const p = String(phone).trim();
      if (p && p.length < 7) {
        return res.status(400).json({ error: 'Phone looks invalid (too short).' });
      }
      if (p && p.length > 20) {
        return res.status(400).json({ error: 'Phone exceeds 20 characters.' });
      }
      updates.phone = p || null;
    }

    // gender (VARCHAR(10) — don’t enforce enum, just length)
    if (gender !== undefined) {
      const g = String(gender).trim();
      if (g && g.length > 10) {
        return res.status(400).json({ error: 'Gender exceeds 10 characters.' });
      }
      updates.gender = g || null;
    }

    // date_of_birth (DATE)
    if (date_of_birth_input !== undefined) {
      let dob = null;
      if (date_of_birth_input) {
        // Accept "YYYY-MM-DD" or any Date-parsable input
        const asStr = String(date_of_birth_input).trim();
        let isoDate;

        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(asStr);
        if (m) {
          // Validate calendar values explicitly
          const yyyy = Number(m[1]), mm = Number(m[2]), dd = Number(m[3]);
          const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
          const valid =
            dt.getUTCFullYear() === yyyy &&
            dt.getUTCMonth() === (mm - 1) &&
            dt.getUTCDate() === dd;
          if (!valid) return res.status(400).json({ error: 'date_of_birth is not a valid calendar date.' });
          isoDate = `${m[1]}-${m[2]}-${m[3]}`;
        } else {
          const d = new Date(asStr);
          if (Number.isNaN(d.getTime())) {
            return res.status(400).json({ error: 'date_of_birth is invalid.' });
          }
          isoDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
            .toISOString()
            .slice(0, 10); // YYYY-MM-DD
        }

        // Not in the future
        const today = new Date();
        const todayIso = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
          .toISOString()
          .slice(0, 10);
        if (isoDate > todayIso) {
          return res.status(400).json({ error: 'date_of_birth cannot be in the future.' });
        }
        // Reasonable lower bound
        if (isoDate < '1900-01-01') {
          return res.status(400).json({ error: 'date_of_birth is unrealistically old.' });
        }
        dob = isoDate;
      }
      updates.date_of_birth = dob; // null clears it
    }

    // Nothing to update?
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No updatable fields provided.',
        allowed_fields: ['email', 'full_name', 'phone', 'gender', 'date_of_birth'],
        alias_fields: { phone_number: 'phone' }
      });
    }

    // Build dynamic UPDATE
    const set = [];
    const params = [];
    let i = 1;

    for (const [col, val] of Object.entries(updates)) {
      set.push(`${col} = $${i++}`);
      params.push(val);
    }
    set.push('updated_at = NOW()');
    params.push(userId);

    const sql = `
      UPDATE users
         SET ${set.join(', ')}
       WHERE id = $${i}
       RETURNING id, full_name, email, phone, gender, date_of_birth, role, created_at, updated_at
    `;

    const { rows } = await pool.query(sql, params);
    if (!rows[0]) return res.status(404).json({ error: 'User not found.' });

    // Include phone_number alias in response to keep old clients happy
    const row = rows[0];
    res.json({
      ...row,
      phone_number: row.phone
    });
  } catch (err) {
    console.error('[updateProfile] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const toBool = (v) => (typeof v === 'boolean' ? v : ['1','true','yes','on'].includes(String(v).toLowerCase()));

function lenOk(v, max) { return v == null || String(v).length <= max; }
function reqNonEmpty(v) { return typeof v === 'string' ? v.trim().length > 0 : v != null; }
function sanitizedOrNull(v) { const s = (v ?? '').toString().trim(); return s === '' ? null : s; }
function assert(cond, msg) { if (!cond) { const e = new Error(msg); e.status = 400; throw e; } }

function normalizeCreatePayload(body) {
  // Required
  assert(reqNonEmpty(body.addr_type), 'addr_type is required.');
  const addr_type = String(body.addr_type).toLowerCase().trim();
  assert(['billing','shipping'].includes(addr_type), "addr_type must be 'billing' or 'shipping'.");

  assert(reqNonEmpty(body.first_name), 'first_name is required.');
  assert(reqNonEmpty(body.last_name),  'last_name is required.');
  assert(reqNonEmpty(body.line1),      'line1 is required.');
  assert(reqNonEmpty(body.city),       'city is required.');
  assert(reqNonEmpty(body.country_code),'country_code is required (2 letters).');

  const first_name  = String(body.first_name).trim();
  const last_name   = String(body.last_name).trim();
  const line1       = String(body.line1).trim();
  const line2       = sanitizedOrNull(body.line2);
  const city        = String(body.city).trim();
  const region      = sanitizedOrNull(body.region);
  const postal_code = sanitizedOrNull(body.postal_code);
  const country_code= String(body.country_code).trim().toUpperCase();
  const email       = sanitizedOrNull(body.email)?.toLowerCase() ?? null;
  const phone       = sanitizedOrNull(body.phone);
  const is_default  = toBool(body.is_default);

  // Length checks (match schema)
  assert(lenOk(first_name, 80), 'first_name exceeds 80 characters.');
  assert(lenOk(last_name, 80), 'last_name exceeds 80 characters.');
  assert(lenOk(line1, 200), 'line1 exceeds 200 characters.');
  assert(lenOk(line2, 200), 'line2 exceeds 200 characters.');
  assert(lenOk(city, 100), 'city exceeds 100 characters.');
  assert(lenOk(region, 100), 'region exceeds 100 characters.');
  assert(lenOk(postal_code, 20), 'postal_code exceeds 20 characters.');
  assert(country_code.length === 2 && /^[A-Z]{2}$/.test(country_code), 'country_code must be 2 letters (ISO alpha-2).');
  assert(lenOk(email, 120), 'email exceeds 120 characters.');
  if (email) assert(emailRe.test(email), 'email is invalid.');
  assert(lenOk(phone, 30), 'phone exceeds 30 characters.');

  return { addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default };
}

function normalizeUpdatePayload(body, existingAddrType) {
  const out = {};
  if (body.addr_type !== undefined) {
    const t = String(body.addr_type).toLowerCase().trim();
    assert(['billing','shipping'].includes(t), "addr_type must be 'billing' or 'shipping'.");
    out.addr_type = t;
  }
  if (body.first_name !== undefined) {
    const v = String(body.first_name).trim(); assert(v.length > 0, 'first_name cannot be empty.'); assert(lenOk(v,80),'first_name exceeds 80.'); out.first_name = v;
  }
  if (body.last_name !== undefined) {
    const v = String(body.last_name).trim(); assert(v.length > 0, 'last_name cannot be empty.'); assert(lenOk(v,80),'last_name exceeds 80.'); out.last_name = v;
  }
  if (body.line1 !== undefined) {
    const v = String(body.line1).trim(); assert(v.length > 0, 'line1 cannot be empty.'); assert(lenOk(v,200),'line1 exceeds 200.'); out.line1 = v;
  }
  if (body.line2 !== undefined) {
    const v = sanitizedOrNull(body.line2); assert(lenOk(v,200),'line2 exceeds 200.'); out.line2 = v;
  }
  if (body.city !== undefined) {
    const v = String(body.city).trim(); assert(v.length > 0, 'city cannot be empty.'); assert(lenOk(v,100),'city exceeds 100.'); out.city = v;
  }
  if (body.region !== undefined) {
    const v = sanitizedOrNull(body.region); assert(lenOk(v,100),'region exceeds 100.'); out.region = v;
  }
  if (body.postal_code !== undefined) {
    const v = sanitizedOrNull(body.postal_code); assert(lenOk(v,20),'postal_code exceeds 20.'); out.postal_code = v;
  }
  if (body.country_code !== undefined) {
    const v = String(body.country_code).trim().toUpperCase(); assert(v.length===2 && /^[A-Z]{2}$/.test(v), 'country_code must be 2 letters.'); out.country_code = v;
  }
  if (body.email !== undefined) {
    const v = sanitizedOrNull(body.email)?.toLowerCase() ?? null; assert(lenOk(v,120),'email exceeds 120.'); if (v) assert(emailRe.test(v),'email is invalid.'); out.email = v;
  }
  if (body.phone !== undefined) {
    const v = sanitizedOrNull(body.phone); assert(lenOk(v,30),'phone exceeds 30.'); out.phone = v;
  }
  if (body.is_default !== undefined) {
    out.is_default = toBool(body.is_default);
  }

  // Determine the effective type for default handling
  out._effective_type = out.addr_type ?? existingAddrType;
  return out;
}

// POST /api/profile/billing-addresses
exports.createBillingAddress = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });

    const b = normalizeCreatePayload(req.body || {});

    await client.query('BEGIN');

    if (b.is_default) {
      await client.query(
        `UPDATE billing_addresses
           SET is_default = FALSE, updated_at = NOW()
         WHERE user_id = $1 AND addr_type = $2`,
        [userId, b.addr_type]
      );
    }

    const { rows } = await client.query(
      `INSERT INTO billing_addresses
        (user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default)
       VALUES
        ($1,      $2,        $3,         $4,       $5,   $6,   $7,   $8,     $9,          $10,          $11,  $12,   $13)
       RETURNING id, user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default, created_at, updated_at`,
      [userId, b.addr_type, b.first_name, b.last_name, b.line1, b.line2, b.city, b.region, b.postal_code, b.country_code, b.email, b.phone, b.is_default]
    );

    await client.query('COMMIT');
    return res.status(201).json(rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    const code = err.status || 500;
    console.error('[createBillingAddress] Error:', err);
    return res.status(code).json({ error: err.message || 'Internal server error' });
  } finally {
    client.release();
  }
};

// PATCH /api/profile/billing-addresses/:id
exports.updateBillingAddress = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized.' });
    const addrId = parseInt(req.params.id, 10);
    if (!Number.isFinite(addrId)) return res.status(400).json({ error: 'Invalid address id.' });

    const { rows: exRows } = await client.query(
      `SELECT * FROM billing_addresses WHERE id = $1 AND user_id = $2`,
      [addrId, userId]
    );
    const existing = exRows[0];
    if (!existing) return res.status(404).json({ error: 'Billing address not found.' });

    const upd = normalizeUpdatePayload(req.body || {}, existing.addr_type);
    const fields = { ...upd };
    delete fields._effective_type;
    if (Object.keys(fields).length === 0) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    await client.query('BEGIN');

    // If setting default OR changing addr_type while this row is default, enforce single default
    const makingDefault = upd.is_default === true;
    const changingTypeWhileDefault = (upd.addr_type && existing.is_default === true);
    if (makingDefault || changingTypeWhileDefault) {
      await client.query(
        `UPDATE billing_addresses
           SET is_default = FALSE, updated_at = NOW()
         WHERE user_id = $1 AND addr_type = $2 AND id <> $3`,
        [userId, upd._effective_type, addrId]
      );
      // ensure is_default true if requested default
      if (makingDefault && !fields.hasOwnProperty('is_default')) {
        fields.is_default = true;
      }
    }

    // Build dynamic UPDATE
    const set = [];
    const params = [];
    let i = 1;
    for (const [col, val] of Object.entries(fields)) {
      set.push(`${col} = $${i++}`);
      params.push(val);
    }
    set.push('updated_at = NOW()');
    params.push(addrId, userId);

    const { rows } = await client.query(
      `UPDATE billing_addresses
          SET ${set.join(', ')}
        WHERE id = $${i++} AND user_id = $${i}
        RETURNING id, user_id, addr_type, first_name, last_name, line1, line2, city, region, postal_code, country_code, email, phone, is_default, created_at, updated_at`,
      params
    );

    await client.query('COMMIT');
    if (!rows[0]) return res.status(404).json({ error: 'Billing address not found after update.' });
    return res.json(rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    const code = err.status || 500;
    console.error('[updateBillingAddress] Error:', err);
    return res.status(code).json({ error: err.message || 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const pmId = parseInt(req.params.id, 10);
    if (!Number.isFinite(pmId)) {
      return res.status(400).json({ error: 'Invalid payment method id.' });
    }

    // Must belong to the caller
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM payment_methods WHERE id = $1 AND user_id = $2',
      [pmId, userId]
    );
    const existing = existingRows[0];
    if (!existing) return res.status(404).json({ error: 'Payment method not found.' });

    // Reject any attempt to send raw card PAN/CVC
    if ('card_number' in req.body || 'cvc' in req.body || 'cvv' in req.body) {
      return res.status(400).json({ error: 'Storing raw card numbers or CVC is not allowed.' });
    }

    const allowedProviders = ['paypal', 'card', 'cod'];
    const allowedStatus = ['active', 'inactive'];
    const updates = {};
    const body = req.body || {};

    // provider
    if (body.provider !== undefined) {
      const p = String(body.provider).toLowerCase();
      if (!allowedProviders.includes(p)) {
        return res.status(400).json({ error: `provider must be one of ${allowedProviders.join(', ')}` });
      }
      updates.provider = p;
    }

    // card fields (metadata only)
    if (body.cardholder_name !== undefined) {
      const v = String(body.cardholder_name).trim();
      if (v && v.length < 2) return res.status(400).json({ error: 'cardholder_name must be at least 2 chars.' });
      updates.cardholder_name = v || null;
    }
    if (body.brand !== undefined) {
      const v = String(body.brand).toLowerCase().trim();
      updates.brand = v || null;
    }
    if (body.last4 !== undefined) {
      const v = String(body.last4).replace(/\D/g, '');
      if (v && v.length !== 4) return res.status(400).json({ error: 'last4 must be 4 digits.' });
      updates.last4 = v || null;
    }
    if (body.exp_month !== undefined) {
      const m = parseInt(body.exp_month, 10);
      if (m && (m < 1 || m > 12)) return res.status(400).json({ error: 'exp_month must be 1..12.' });
      updates.exp_month = Number.isFinite(m) ? m : null;
    }
    if (body.exp_year !== undefined) {
      const y = parseInt(body.exp_year, 10);
      const currentYear = new Date().getFullYear();
      if (y && (y < currentYear || y > currentYear + 20)) {
        return res.status(400).json({ error: `exp_year must be between ${currentYear} and ${currentYear + 20}.` });
      }
      updates.exp_year = Number.isFinite(y) ? y : null;
    }

    // paypal fields
    if (body.paypal_payer_id !== undefined) {
      const v = String(body.paypal_payer_id).trim();
      updates.paypal_payer_id = v || null;
    }
    if (body.paypal_email !== undefined) {
      const v = String(body.paypal_email).trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (v && !emailRe.test(v)) return res.status(400).json({ error: 'paypal_email is invalid.' });
      updates.paypal_email = v || null;
    }

    // status
    if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      if (!allowedStatus.includes(s)) {
        return res.status(400).json({ error: `status must be one of ${allowedStatus.join(', ')}` });
      }
      updates.status = s;
    }

    // is_default (accepts booleans or truthy strings)
    const toBool = (val) => {
      if (typeof val === 'boolean') return val;
      const s = String(val).toLowerCase();
      return ['1', 'true', 'yes', 'on'].includes(s);
    };
    let makeDefault = null;
    if (body.is_default !== undefined) {
      makeDefault = toBool(body.is_default);
      updates.is_default = makeDefault;
    }

    // If provider is explicitly changing, null out fields that don't apply
    const effectiveProvider = updates.provider || existing.provider;
    if (updates.provider !== undefined) {
      if (effectiveProvider === 'paypal') {
        updates.cardholder_name ??= null;
        updates.brand ??= null;
        updates.last4 ??= null;
        updates.exp_month ??= null;
        updates.exp_year ??= null;
      } else if (effectiveProvider === 'card') {
        updates.paypal_payer_id ??= null;
        updates.paypal_email ??= null;
      } else if (effectiveProvider === 'cod') {
        updates.cardholder_name ??= null;
        updates.brand ??= null;
        updates.last4 ??= null;
        updates.exp_month ??= null;
        updates.exp_year ??= null;
        updates.paypal_payer_id ??= null;
        updates.paypal_email ??= null;
      }
    }

    if (Object.keys(updates).length === 0 && makeDefault === null) {
      return res.status(400).json({ error: 'No updatable fields provided.' });
    }

    // Build UPDATE parts
    const set = [];
    const params = [];
    let i = 1;
    for (const [col, val] of Object.entries(updates)) {
      set.push(`${col} = $${i++}`);
      params.push(val);
    }
    set.push(`updated_at = NOW()`); // always touch updated_at
    params.push(pmId, userId);

    const sql = `
      UPDATE payment_methods
         SET ${set.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING *
    `;

    // If making default, wrap in a small transaction so only one default remains
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (makeDefault === true) {
        await client.query(
          'UPDATE payment_methods SET is_default = FALSE WHERE user_id = $1 AND id <> $2',
          [userId, pmId]
        );
        // ensure flag is set even if not provided in updates
        if (!('is_default' in updates)) {
          await client.query(
            'UPDATE payment_methods SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2',
            [pmId, userId]
          );
        }
      }

      const { rows } = await client.query(sql, params);
      await client.query('COMMIT');

      if (!rows[0]) return res.status(404).json({ error: 'Payment method not found.' });
      return res.json(rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[updatePaymentMethod] Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};