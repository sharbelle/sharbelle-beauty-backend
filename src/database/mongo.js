import mongoose from "mongoose";
import env from "../config/env.js";

export const connectDatabase = async () => {
  await mongoose.connect(env.mongodbUri, {
    serverSelectionTimeoutMS: 10_000,
  });

  console.log(`Connected to MongoDB at ${mongoose.connection.host}`);
};

export const disconnectDatabase = async () => {
  await mongoose.disconnect();
};
