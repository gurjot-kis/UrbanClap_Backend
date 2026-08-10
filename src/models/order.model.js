import mongoose from "mongoose";
const { Schema } = mongoose;

/**
 * ORDER MODEL
 * Created at checkout. This is the "what was bought / where it's going"
 * record. Money movement itself lives in the Payment model — Order just
 * points at it via `payment_id` + keeps a denormalized `paymentStatus`
 * for fast list/filter queries.
 *
 * Today: COD only -> a Payment doc is still created (method: "cod",
 * status: "pending"), just with no gateway involved. Later, when a
 * gateway is added, only Payment gains fields (provider, transactionId,
 * gatewayResponse, etc). Order does not need to change.
 */

const orderItemSchema = new Schema(
  {
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // snapshot at time of order, so later edits to the Product
    // (price/name/image changes) never alter historical orders
    snapshot: {
      name: { type: String, required: true },
      slug: { type: String, required: true },
      mainImage: { type: String, required: true },
    },

    variant: {
      key: { type: String, default: null },
      label: { type: String, default: null },
      image: { type: String, default: null },
    },

    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // e.g. ORD-20260810-XXXXX, generate in a pre-save hook / service layer
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    address_id: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },

    slotBooking_id: {
      type: Schema.Types.ObjectId,
      ref: "SlotBooking",
      default: null, // required only for orders that involve a service slot/delivery slot
    },

    vendor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // multi-vendor support, optional
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: (v) => Array.isArray(v) && v.length > 0,
    },

    pricing: {
      itemsTotal: { type: Number, required: true, min: 0 },
      taxAmount: { type: Number, default: 0, min: 0 },
      deliveryFee: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
    },

    couponCode: { type: String, default: null, trim: true },

    // How the customer chose to pay. Null until the payment step is
    // confirmed — only "cod" is functional today; "online" is wired
    // but unreachable until a gateway is integrated.
    paymentMethod: {
      type: String,
      enum: ["cod", "online", null],
      default: null,
    },

    // Denormalized copy of Payment.status, kept in sync by the service
    // layer whenever the Payment doc changes.
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
      index: true,
    },

    payment_id: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    status: {
      type: String,
      enum: [
        "payment_pending", // order shell created, cart untouched, awaiting payment method confirmation
        "pending", // payment method confirmed, order placed/booked
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "payment_pending",
      index: true,
    },

    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: "payment_pending" }],
    },

    cancellation: {
      cancelledBy: {
        type: String,
        enum: ["user", "vendor", "admin", null],
        default: null,
      },
      reason: { type: String, default: null },
      cancelledAt: { type: Date, default: null },
      refundAmount: { type: Number, default: null },
    },

    deliveredAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ vendor_id: 1, status: 1 });

const Order = mongoose.model("Order", orderSchema);
export default Order;