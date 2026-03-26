const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectMockDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log('✅ Mock MongoDB (in-memory) connected:', uri);
};

const disconnectMockDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
  console.log('Mock MongoDB disconnected');
};

module.exports = { connectMockDB, disconnectMockDB };
