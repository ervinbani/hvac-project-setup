/**
 * Standalone seed runner for real MongoDB.
 * Usage: npm run seed
 * Requires MONGODB_URI in .env
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const seed = require('./seed');

(async () => {
  await connectDB();
  await seed();
  await mongoose.disconnect();
  console.log('\nDone. Disconnected.');
  process.exit(0);
})();
