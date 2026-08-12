import mongoose from "mongoose";
const { Schema } = mongoose;

const slotBookingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [
      {
        product_id: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant: {
          key: { type: String, default: null },
          label: { type: String, default: null },
          price: { type: Number, default: null },
        },
        basePrice: { type: Number, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        lineTotal: { type: Number, required: true },
        _id: false,
      },
    ],

    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    sub_category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    vendor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    slotType: {
      type: String,
      enum: ["instant", "schedule"],
      required: true,
    },

    scheduleDetails: {
      date: { type: Date, default: null },
      day: { type: String, default: null },
      startTime: { type: String, default: null },
      endTime: { type: String, default: null },
      vendorSlotId: {
        type: Schema.Types.ObjectId,
        ref: "VendorSlot",
        default: null,
      },
    },

    instantDetails: {
      requestedAt: { type: Date, default: null },
      expectedArrivalTime: { type: Date, default: null },
      assignedAt: { type: Date, default: null },
    },

    duration: { type: Number, required: true },
    address_id: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      default: null,
    },
    serviceAddress: {
      contactName: { type: String, required: true },
      contactPhone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: "" },
      landmark: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },

    totalAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "vendor_on_way",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "failed"],
      default: "pending",
    },
    payment_id: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },

    otp: { type: String, default: null },
    cancellation: {
      cancelledBy: {
        type: String,
        enum: ["user", "vendor", "admin"],
        default: null,
      },
      reason: { type: String, default: null },
      cancelledAt: { type: Date, default: null },
      refundAmount: { type: Number, default: null },
    },

    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: "SlotBooking",
      default: null,
    },
  },
  { timestamps: true, versionKey: false },
);

slotBookingSchema.index({ location: "2dsphere" });
slotBookingSchema.index({ user: 1, status: 1 });
slotBookingSchema.index({ vendor_id: 1, "scheduleDetails.date": 1 });
slotBookingSchema.index({ status: 1, slotType: 1 });
slotBookingSchema.index({ category_id: 1, status: 1 });

const SlotBooking = mongoose.model("SlotBooking", slotBookingSchema);
export default SlotBooking;
