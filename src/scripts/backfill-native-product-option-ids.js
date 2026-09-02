import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import NativeProduct from "../models/nativeProduct.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

async function run() {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const product = await NativeProduct.collection.findOne({
    _id: new mongoose.Types.ObjectId("6a8d37fa4c784de488b62f07"),
  });

  if (!product) {
    throw new Error("Native product not found");
  }

  if (!product.options?.length) {
    console.log("No options found");
    await mongoose.disconnect();
    return;
  }

  const updatedOptions = product.options.map((option) => ({
    ...option,
    _id: new mongoose.Types.ObjectId(),
  }));

  const result = await NativeProduct.collection.updateOne(
    {
      _id: new mongoose.Types.ObjectId("6a8d37fa4c784de488b62f07"),
    },
    {
      $set: {
        options: updatedOptions,
      },
    },
  );

  console.log(`Modified documents: ${result.modifiedCount}`);
  console.log("Option _ids added successfully");

  await mongoose.disconnect();
  console.log("Done");
}

run().catch(async (err) => {
  console.error("Migration failed:", err);

  await mongoose.disconnect();

  process.exit(1);
});
