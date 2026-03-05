const db = require('../../config/db'); // Adjust path as needed
const paginate = require('../../utils/pagination'); // Pagination utility

// Get all plans
exports.getAllPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const sort = req.query.sort || '+id';
    const limit = parseInt(req.query.limit) || 10;

    const validColumns = [
      "id",
      "name",
      "description",
      "price",
      "duration_days",
      "features",
      "currency"
    ];

    const filters = {};
    for (const key in req.query) {
      if (validColumns.includes(key) && key !== 'page' && key !== 'limit' && key !== 'sort') {
        filters[key] = req.query[key];
      }
    }

    const result = await paginate({
      table: 'plans',
      page,
      limit,
      sort,
      filters
    });

    res.json(result);
  } catch (err) {
    console.error('Pagination error:', err.message);
    res.status(400).json({ error: 'Pagination failed: ' + err.message });
  }
};

// Get plan by ID
exports.getPlanById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM plans WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new plan
exports.createPlan = async (req, res) => {
  try {
    let { name, description, price, duration, features, currency } = req.body;

    // Basic required field check
    if (!name || price == null || duration == null) {
      return res.status(400).json({ error: 'name, price, and duration are required.' });
    }

    // Coerce numbers
    const priceNum = Number(price);
    const durationDays = parseInt(duration, 10);
    if (Number.isNaN(priceNum) || Number.isNaN(durationDays)) {
      return res.status(400).json({ error: 'price and duration must be numeric.' });
    }

    // Normalize features into an array of strings
    const featuresArray = normalizeFeatures(features);

    // Fallback currency
    const currencyCode = currency && String(currency).trim() ? currency : 'SAR';

    const result = await db.query(
      `INSERT INTO plans (name, description, price, duration_days, features, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description || null, priceNum, durationDays, featuresArray, currencyCode]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Accepts:
 *   - Array: ['A', 'B']
 *   - JSON string: '["A","B"]'
 *   - CSV: 'A,B,C'
 *   - Quoted CSV: '"A", "B", "C"' or "'A', 'B', 'C'"
 * Returns [] if nothing valid provided.
 */
function normalizeFeatures(input) {
  if (Array.isArray(input)) {
    return input.map(String).map(cleanFeature).filter(Boolean);
  }

  if (typeof input !== 'string') return [];

  const str = input.trim();
  if (!str) return [];

  // Try JSON parse first
  if ((str.startsWith('[') && str.endsWith(']'))) {
    try {
      const arr = JSON.parse(str);
      if (Array.isArray(arr)) {
        return arr.map(String).map(cleanFeature).filter(Boolean);
      }
    } catch (_) {
      /* fall through to CSV parse */
    }
  }

  // CSV fallback: split on commas not inside quotes is overkill for admin; simple split works
  return str
    .split(',')
    .map(cleanFeature)
    .filter(Boolean);
}

function cleanFeature(s) {
  if (s == null) return '';
  let t = String(s).trim();

  // Strip wrapping quotes (single or double) if present
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

// Update a plan
exports.updatePlan = async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description, price, duration, features, currency } = req.body;

  if (!name || !price || !duration) {
    return res.status(400).json({ error: 'name, price, and duration are required.' });
  }

  let featuresArray = features;

  // Handle string input like: '"24/7 virtual care", "Medicine home delivery", "Lab test discounts"'
  if (typeof features === 'string') {
    featuresArray = features
      .split(',')
      .map(f => f.trim().replace(/^"|"$/g, '')) // trim and remove outer quotes
      .filter(f => f.length > 0);
  }

  try {
    const result = await db.query(
      'UPDATE plans SET name = $1, description = $2, price = $3, duration_days = $4, features = $5, currency = $6 WHERE id = $7 RETURNING *',
      [name, description, price, duration, featuresArray, currency || 'SAR', id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a plan
exports.deletePlan = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM plans WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    res.json({ message: 'Plan deleted', plan: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};