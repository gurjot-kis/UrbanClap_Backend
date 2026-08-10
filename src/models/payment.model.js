import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * PAYMENT MODEL
 * One doc per payment attempt/transaction. Can be referenced from Order
 * (product checkout) and/or SlotBooking (service payment) via their
 * payment_id fields.
 *
 * COD flow (today):
 *   create Payment { method: "cod", provider: "none", status: "pending" }
 *   on delivery -> mark status: "paid", paidAt: now
 *
 * Gateway flow (later): same document shape, just populate
 *   provider, providerOrderId, transactionId, gatewayResponse, paidAt.
 *   No new model, no schema migration for existing COD records.
 */

const refundSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, default: "" },
    refundedAt: { type: Date, default: Date.now },
    refundTransactionId: { type: String, default: null }, // gateway refund ref, if any
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

    // polymorphic-ish link: a payment can back an Order or a SlotBooking
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

    // which gateway processed it. "none" for COD until you integrate one.
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

    // gateway-side identifiers, populated only once a gateway is wired up
    providerOrderId: { type: String, default: null }, // e.g. razorpay order_id
    transactionId: { type: String, default: null }, // e.g. razorpay/stripe payment_id
    signature: { type: String, default: null }, // for webhook/signature verification

    // raw gateway payload for debugging/reconciliation — kept flexible on purpose
    gatewayResponse: { type: Schema.Types.Mixed, default: null },

    paidAt: { type: Date, default: null },
    failureReason: { type: String, default: null },

    refunds: {
      type: [refundSchema],
      default: [],
    },

    attempt: { type: Number, default: 1, min: 1 }, // increments on retry after a failed payment
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
