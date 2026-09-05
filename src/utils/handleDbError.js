// Maps PostgreSQL constraint error codes to HTTP 400 responses.
// Non-constraint errors fall through as 500.
const PG_CLIENT_ERRORS = {
  '23502': (err) => `Missing required field: ${err.column || err.message}`,
  '23503': (err) => `Referenced record does not exist: ${err.detail || err.message}`,
  '23505': (err) => `Duplicate entry: ${err.detail || err.message}`,
  '23514': (err) => `Value violates a constraint: ${err.detail || err.message}`,
  '22P02': (err) => `Invalid data type: ${err.message}`,
  '22007': (err) => `Invalid date/time format: ${err.message}`,
  '22003': (err) => `Numeric value out of range: ${err.message}`,
  '23P01': () => 'This overlaps an existing appointment for the doctor.',
};

function handleDbError(err, res) {
  const builder = PG_CLIENT_ERRORS[err.code];
  if (builder) {
    return res.status(400).json({ error: builder(err) });
  }
  console.error('[DB Error]', err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = handleDbError;
