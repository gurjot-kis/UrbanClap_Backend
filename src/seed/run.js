import "dotenv/config";
import mongoose from "mongoose";
import { seedCategoryVendorsAndSlots } from "./seedCategoryVendors.js";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await seedCategoryVendorsAndSlots();
  await mongoose.disconnect();
  console.log("Done");
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});