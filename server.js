require('dotenv').config();

// Fail loudly at boot if required secrets/config are missing, rather than
// silently degrading (a missing JWT_SECRET used to fall back to a hardcoded
// string, which would have accepted forged tokens signed with that string).
const dbMode = (process.env.DB_MODE ||
  (process.env.DATABASE_URL || process.env.DB_URL ? 'neon' : 'local')).toLowerCase();

const missing = [];
if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
if (!process.env.ENCRYPTION_KEY) missing.push('ENCRYPTION_KEY');
if (dbMode === 'neon') {
  if (!process.env.DATABASE_URL && !process.env.DB_URL) missing.push('DATABASE_URL (or DB_URL)');
} else {
  if (!process.env.DB_USER) missing.push('DB_USER');
  if (!process.env.DB_DATABASE) missing.push('DB_DATABASE');
}

if (missing.length > 0) {
  console.error(`[BOOT] Missing required environment variable(s): ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[API] HelixaCare backend running on http://localhost:${PORT}`);
  console.log(`[API] Swagger docs at http://localhost:${PORT}/api-docs`);
});
