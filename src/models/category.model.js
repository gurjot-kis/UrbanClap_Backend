import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    level: {
      type: Number,
      required: true,
      enum: [1, 2, 3],
      default: 1,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category_image: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt & updatedAt
    versionKey: false // Removes __v field
  }
);

// Indexes
categorySchema.index({ parent_id: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ name: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;