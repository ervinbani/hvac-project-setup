/**
 * server.mock.js
 * Starts the Brillo API with an in-memory MongoDB (no real DB needed).
 * Data is seeded automatically on start.
 *
 * Usage:  npm run dev:mock
 */

require('dotenv').config();
const app = require('./src/app');
const { connectMockDB } = require('./src/config/db.mock');
const seed = require('./scripts/seed');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectMockDB();
    await seed();
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Brillo API (mock mode) running on http://localhost:${PORT}`);
      console.log('   DB: in-memory MongoDB (data resets on restart)');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Run this to free it (Windows):  cmd /c "for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /PID %a /F"`);
        console.error(`   Or set a different port:        PORT=5001 npm run dev:mock\n`);
      } else {
        console.error('Server error:', err);
      }
      process.exit(1);
    });
  } catch (err) {
    console.error('Failed to start mock server:', err);
    process.exit(1);
  }
})();
