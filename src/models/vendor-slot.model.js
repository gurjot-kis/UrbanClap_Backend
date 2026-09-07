import mongoose from "mongoose";
const { Schema } = mongoose;

const vendorSlotSchema = new Schema(
  {
    vendor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      type: Date,
      required: true,
      index: true,
    },

    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },

    // Maximum number of bookings allowed for this slot.
    capacity: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Number of bookings currently using this slot.
    bookedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Vendor can manually block/unblock a slot.
    status: {
      type: String,
      enum: ["available", "blocked"],
      default: "available",
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

vendorSlotSchema.index(
  { vendor_id: 1, date: 1, startTime: 1 },
  { unique: true },
);
vendorSlotSchema.index({ location: "2dsphere" });
vendorSlotSchema.index({ vendor_id: 1, category_id: 1, date: 1, status: 1 });

const VendorSlot = mongoose.model("VendorSlot", vendorSlotSchema);
export default VendorSlot;
