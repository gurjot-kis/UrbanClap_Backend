import mongoose from "mongoose";
import { warmCache } from "../utils/synonymCache.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected with Mongoose");
    await warmCache(); // runs right after DB is ready
    console.log("Synonym cache ready");
  } catch (error) {
    console.error("DB Connection Error:", error.message);
    process.exit(1); // stop server if DB fails
  }
};

export default connectDB;
