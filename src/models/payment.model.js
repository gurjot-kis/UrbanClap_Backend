import mongoose from "mongoose";
const { Schema } = mongoose;

const refundSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    refundedAt: { type: Date, default: Date.now },
    refundTransactionId: { type: String, default: null },
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    order_id: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    slotBooking_id: {
      type: Schema.Types.ObjectId,
      ref: "SlotBooking",
      default: null,
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },

    method: {
      type: String,
      enum: ["cod", "card", "upi", "netbanking", "wallet"],
      required: true,
      default: "cod",
    },

    provider: {
      type: String,
      enum: ["none", "razorpay", "stripe", "paytm", "phonepe", "cashfree"],
      default: "none",
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "partially_refunded"],
      default: "pending",
      index: true,
    },

    providerOrderId: { type: String, default: null },
    transactionId: { type: String, default: null },
    signature: { type: String, default: null },

    gatewayResponse: { type: Schema.Types.Mixed, default: null },

    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },

    refunds: {
      type: [refundSchema],
      default: [],
    },

    attempt: { type: Number, default: 1, min: 1 },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
