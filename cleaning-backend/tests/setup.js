const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

const connect = async () => {
  mongod = await MongoMemoryServer.create({
    binary: {
      // Use locally installed mongod (avoids ARM64 download issues on Windows)
      systemBinary: process.platform === 'win32' ? 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe' : undefined,
    },
  });
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = { connect, disconnect, clearCollections };
