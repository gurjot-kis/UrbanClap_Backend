import mongoose from "mongoose";

const vendorServiceSchema = new mongoose.Schema(
  {
    vendor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  { timestamps: true, versionKey: false },
);

vendorServiceSchema.index({ vendor_id: 1, service_id: 1 }, { unique: true });
vendorServiceSchema.index({ vendor_id: 1, status: 1 });

const VendorService = mongoose.model("VendorService", vendorServiceSchema);
export default VendorService;
