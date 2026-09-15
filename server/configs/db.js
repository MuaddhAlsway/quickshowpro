import mongoose from "mongoose";

const connectDB = async () => {
  // 1 = connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2 = connecting
  if (mongoose.connection.readyState === 2) {
    return mongoose.connection.asPromise();
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      tls: true,
      serverSelectionTimeoutMS: 15000,
    });

    console.log("Database connected");

    return mongoose.connection;
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
};

export default connectDB;