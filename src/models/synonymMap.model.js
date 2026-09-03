import mongoose from "mongoose";

const SynonymMapSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    synonyms: {
      type: [String],
      default: [],
    },
    bidirectional: {
      type: Boolean,
      default: true, // "ac" ↔ "air conditioner" both ways
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    usageCount: {
      type: Number,
      default: 0, // increment when this mapping actually fires
    },
  },
  { timestamps: true, versionKey: false }
);

SynonymMapSchema.index({ term: 1 });
SynonymMapSchema.index({ status: 1 });

export default mongoose.model("SynonymMap", SynonymMapSchema);