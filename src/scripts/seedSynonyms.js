import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import SynonymMap from "../models/synonymMap.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const SEED = [
  { term: "ac", synonyms: ["air conditioner", "air conditioning"] },
  { term: "tv", synonyms: ["television", "smart tv"] },
  { term: "fridge", synonyms: ["refrigerator", "freeze"] },
  { term: "geyser", synonyms: ["water heater", "geyser machine"] },
  { term: "sofa", synonyms: ["couch", "sofa set", "settee"] },
];

await mongoose.connect(process.env.MONGO_URI);
await SynonymMap.insertMany(SEED, { ordered: false }).catch(() => {});
console.log("Seeded");
process.exit(0);
