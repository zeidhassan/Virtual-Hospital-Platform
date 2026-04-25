require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[API] HelixaCare backend running on http://localhost:${PORT}`);
  console.log(`[API] Swagger docs at http://localhost:${PORT}/api-docs`);
});
