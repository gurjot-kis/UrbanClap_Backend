import mongoose from "mongoose";
const { Schema } = mongoose;

const vendorSlotSchema = new Schema(
  {
    vendor_id: {
      type: Schema.Types.ObjectId,
      ref: "User", // role: Vendor
      required: true,
      index: true,
    },

    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    date: {
      type: Date, // date-only (00:00 UTC), day info derivable
      required: true,
    },

    startTime: { type: String, required: true }, // "14:00"
    endTime: { type: String, required: true },   // "14:30"

    // denormalized vendor location for fast geo search without join
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    status: {
      type: String,
      enum: ["available", "blocked", "booked"],
      default: "available",
      index: true,
    },

    booking_id: {
      type: Schema.Types.ObjectId,
      ref: "SlotBooking",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);

vendorSlotSchema.index({ vendor_id: 1, date: 1, startTime: 1 }, { unique: true });
vendorSlotSchema.index({ location: "2dsphere" });
vendorSlotSchema.index({ category_id: 1, date: 1, status: 1 });

const VendorSlot = mongoose.model("VendorSlot", vendorSlotSchema);
export default VendorSlot;