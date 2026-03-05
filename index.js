// index.js
const app = require('./src/app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Virtual Hospital Platform backend running at http://localhost:${PORT}`);
});
