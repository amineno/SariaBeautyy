const mongoose = require('mongoose');

const connectDB = async (retries = 3, interval = 3000) => {
  const uris = [
    process.env.MONGO_URI,
    'mongodb://127.0.0.1:27017/saria_beauty'
  ].filter(Boolean);

  for (const uri of uris) {
    let currentRetries = retries;
    console.log(`Attempting to connect to MongoDB: ${uri.split('@').pop()}`); // Log host for safety
    
    while (currentRetries > 0) {
      try {
        const conn = await mongoose.connect(uri, {
          serverSelectionTimeoutMS: 5000,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      } catch (error) {
        currentRetries -= 1;
        console.error(`MongoDB Connection Error (${uri.split('@').pop()}): ${error.message}. Retries left: ${currentRetries}`);
        if (currentRetries > 0) {
          await new Promise(resolve => setTimeout(resolve, interval));
        }
      }
    }
  }

  console.error('All MongoDB connection attempts failed. Exiting...');
  process.exit(1);
};

module.exports = connectDB;

