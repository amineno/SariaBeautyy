const mongoose = require('mongoose');

const connectDB = async (retries = 5, interval = 5000) => {
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/saria_beauty', {
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      retries -= 1;
      console.error(`MongoDB Connection Error: ${error.message}. Retries left: ${retries}`);
      if (retries === 0) {
        console.error('Could not connect to MongoDB. Exiting...');
        process.exit(1);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
};

module.exports = connectDB;

