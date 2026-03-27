require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

(async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  console.log('Database dropped!');
  await mongoose.disconnect();
  process.exit(0);
})();
