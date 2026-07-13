import mongoose from "mongoose";

const CartSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },
    guest_id: {
      type: String,
      default: "",
      index: true,
      trim: true,
    },
    product_id: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { timestamps: true }
);

CartSchema.index(
  { user_id: 1, product_id: 1 },
  {
    unique: true,
    partialFilterExpression: { user_id: { $gt: "" } },
  }
);

CartSchema.index(
  { guest_id: 1, product_id: 1 },
  {
    unique: true,
    partialFilterExpression: { guest_id: { $gt: "" } },
  }
);

const Cart = mongoose.model("Cart", CartSchema);

export default Cart;
