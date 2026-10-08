import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet = null;

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;

  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('No MONGODB_URI found in environment. Initializing fallback memory database...');
    try {
      replSet = await MongoMemoryReplSet.create({
        replSet: { storageEngine: 'wiredTiger' }
      });
      mongoUri = replSet.getUri();
      console.log(`MongoMemoryReplSet started at: ${mongoUri}`);
    } catch (err) {
      console.warn('MongoMemoryReplSet start error:', err.message);
    }
  }

  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected successfully.');
    } catch (err) {
      console.error('Mongoose connection failure:', err.message);
    }
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
      console.log('MongoMemoryReplicaSet stopped.');
    }
  } catch (err) {
    console.error('Error during database disconnection:', err);
  }
}
