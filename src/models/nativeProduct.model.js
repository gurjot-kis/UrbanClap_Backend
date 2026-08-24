import mongoose from "mongoose";

const RatingSchema = new mongoose.Schema(
  {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const OptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    image: { type: String, default: null },
    price: { type: Number, required: true, min: 0 },
    rating: { type: RatingSchema, default: () => ({}) },
  },
  { _id: true },
);

const ExchangeStepSchema = new mongoose.Schema(
  {
    step: { type: Number, required: true, min: 1 },
    url: { type: String, required: true },
  },
  { _id: true },
);

const MediaItemSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: undefined,
      validate: {
        validator: function (v) {
          if (this.type === "image" || this.type === "video") {
            return v != null && v.trim() !== "";
          }
          return true; 
        },
        message: "url is required for image and video types",
      },
    },
    type: { type: String, enum: ["image", "video", "slider"], required: true },
    sort_order: { type: Number, default: 0 },

    slider_title: { type: String, default: undefined },
    slider_images: { type: [String], default: undefined },
  },
  { _id: true },
);

const ProductSpecificationSchema = new mongoose.Schema(
  {
    short_desc_image: {
      type: String,
      default: null,
    },

    full_desc_content: {
      type: [
        {
          sort_order: {
            type: Number,
            required: true,
            min: 1,
          },
          image: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },
  },
  { _id: false },
);

const NativeProductSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    base_price: {
      type: Number,
      required: true,
      min: 0,
    },
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NativeCategory",
      required: true,
    },
    sub_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NativeCategory",
      default: null,
    },
    main_image: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "inactive"],
    },
    rating: {
      type: RatingSchema,
      default: () => ({}),
    },
    options: {
      type: [OptionSchema],
      default: [],
    },
    exchange_steps: {
      type: [ExchangeStepSchema],
      default: [],
    },
    banner_gallery: {
      type: [MediaItemSchema],
      default: [],
    },
    product_details: {
      type: [MediaItemSchema],
      default: [],
    },
    product_specification: {
      type: ProductSpecificationSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
NativeProductSchema.index({ slug: 1 });
NativeProductSchema.index({ category_id: 1 });
NativeProductSchema.index({ sub_category_id: 1 });
NativeProductSchema.index({ status: 1 });
NativeProductSchema.index({ "rating.average": -1 });

const NativeProduct = mongoose.model("NativeProduct", NativeProductSchema);
export default NativeProduct;
