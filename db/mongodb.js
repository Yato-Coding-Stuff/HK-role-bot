import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";

const client = new MongoClient(uri);
const db = client.db('user_messages');
const collection = db.collection('user_messages');

const connectToMongoDB = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    await client.db().admin().ping();
    console.log("MongoDB connection is valid");
    await collection.createIndex({ userId: 1 }, { unique: true });
  } catch (e) {
    console.error("Failed to connect to MongoDB:", e);
  }
};

connectToMongoDB();

export { client, collection };