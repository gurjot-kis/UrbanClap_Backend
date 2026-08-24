import mongoose from "mongoose";

const nativeCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    parent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NativeCategory",
      default: null,
      index: true,
    },

    level: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    title: {
      type: String,
      default: "",
      trim: true,
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

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },

    sort_order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes
nativeCategorySchema.index({ parent_id: 1 });
nativeCategorySchema.index({ level: 1 });
nativeCategorySchema.index({ status: 1 });
nativeCategorySchema.index({ name: 1 });
nativeCategorySchema.index({ parent_id: 1, name: 1 });

// Prevent a category from having itself as its parent
nativeCategorySchema.pre("save", function (next) {
  if (this.parent_id && this.parent_id.equals(this._id)) {
    return next(new Error("A category cannot be its own parent"));
  }

  next();
});

const NativeCategory = mongoose.model("NativeCategory", nativeCategorySchema);

export default NativeCategory;
