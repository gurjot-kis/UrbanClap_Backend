import mongoose from "mongoose";

const CartItemVariantSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const CartItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    snapshot: {
      name: { type: String, required: true },
      slug: { type: String, required: true },
      mainImage: { type: String, required: true },
    },

    variant: {
      type: CartItemVariantSchema,
      default: null,
    },

    unitPrice: { type: Number, required: true, min: 0 },

    quantity: { type: Number, required: true, min: 1, default: 1 },

    lineTotal: { type: Number, required: true, min: 0, default: 0 },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const CartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    guestId: {
      type: String,
      trim: true,
    },

    items: {
      type: [CartItemSchema],
      default: [],
    },

    totalItems: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0, min: 0 },

    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

CartSchema.index({ user_id: 1 }, { unique: true, sparse: true });
CartSchema.index({ guestId: 1 }, { unique: true, sparse: true });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

CartSchema.methods.recalculate = function () {
  for (const item of this.items) {
    item.lineTotal = +(item.unitPrice * item.quantity).toFixed(2);
  }
  this.totalItems = this.items.reduce((sum, i) => sum + i.quantity, 0);
  this.totalPrice = +this.items
    .reduce((sum, i) => sum + i.lineTotal, 0)
    .toFixed(2);
};

const Cart = mongoose.model("Cart", CartSchema);
export default Cart;
