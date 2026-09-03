import mongoose from "mongoose";

const VariantSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    image: { type: String, trim: true, default: null },
  },
  { _id: false },
);

const RatingSchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    includes: {
      type: [String],
      default: [],
    },

    mainImage: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },

    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    variantLabel: {
      type: String,
      default: "",
      trim: true,
    },

    variants: {
      type: [VariantSchema],
      default: [],
    },

    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: RatingSchema,
      default: () => ({ average: 0, count: 0 }),
    },

    maxQuantity: {
      type: Number,
      default: 99,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "active", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

ProductSchema.index({ name: 1 });
ProductSchema.index({ slug: 1 });
ProductSchema.index({ category_id: 1 });
ProductSchema.index({ sub_category_id: 1 });
ProductSchema.index({ vendor_id: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ basePrice: 1 });
ProductSchema.index({ "rating.average": -1 });

ProductSchema.index(
  { name: "text", description: "text", shortDescription: "text" },
  {
    weights: { name: 10, shortDescription: 5, description: 1 },
    name: "product_text_idx",
  },
);

// ─── Model ───────────────────────────────────────────────────────────────────

const Product = mongoose.model("Product", ProductSchema);

export default Product;
