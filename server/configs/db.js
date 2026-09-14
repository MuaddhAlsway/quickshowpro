import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      tls: true,
      serverSelectionTimeoutMS: 15000,
    });

    console.log("Database connected");
  } catch (error) {
    console.error("Database connection failed:");
    console.error(error);
    throw error;
  }
};

export default connectDB;