import mongoose from "mongoose";

const SearchLogSchema = new mongoose.Schema(
  {
    query: { type: String, required: true, trim: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    result_count: { type: Number, default: 0 },
    source: {
      type: String,
      enum: ["service", "native", "both"],
      default: "both",
    },
  },  
  { timestamps: true, versionKey: false },
);

SearchLogSchema.index({ query: 1 });
SearchLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 90 },
); 

export default mongoose.model("SearchLog", SearchLogSchema);
