// src/scripts/backfill-variant-keys.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Product from "../models/product.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const slugify = (text) =>
  String(text)
    .toLowerCase()
    .trim()
    .replace(/</g, "under-")
    .replace(/>/g, "over-")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

async function run() {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    console.error("MONGO_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const products = await Product.find({ "variants.0": { $exists: true } }).exec();
  console.log(`Found ${products.length} products with variants`);

  let updatedCount = 0;

  for (const product of products) {
    let changed = false;
    const seenKeys = new Set();

    for (const variant of product.variants) {
      // FORCE regenerate (overwrite) — one-time cleanup run
      const newKey = slugify(variant.label);

      let finalKey = newKey;
      let suffix = 2;
      while (seenKeys.has(finalKey)) {
        finalKey = `${newKey}-${suffix++}`;
      }
      seenKeys.add(finalKey);

      if (variant.key !== finalKey) {
        variant.key = finalKey;
        changed = true;
      }
    }

    if (changed) {
      await product.save();
      updatedCount++;
      console.log(`Updated: ${product.name}`);
    }
  }

  console.log(`Backfilled ${updatedCount} products`);
  await mongoose.disconnect();
  console.log("Done");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});