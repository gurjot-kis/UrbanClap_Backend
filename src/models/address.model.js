import mongoose from "mongoose";
const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },

    label: {
      type: String,
      enum: ["home", "work", "other"],
      default: "home",
    },

    customLabel: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    contactName: {
      type: String,
      required: [true, "Contact name is required"],
      trim: true,
      maxlength: 100,
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
      trim: true,
      match: [/^[6-9]\d{9}$/, "Please enter a valid 10-digit phone number"],
    },

    houseNo: { type: String, trim: true, maxlength: 100 },
    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
      maxlength: 200,
    },
    addressLine2: { type: String, trim: true, maxlength: 200 },
    landmark: { type: String, trim: true, maxlength: 150 },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      index: true,
    },
    state: { type: String, required: [true, "State is required"], trim: true },
    country: { type: String, required: true, trim: true, default: "India" },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
      match: [/^\d{6}$/, "Please enter a valid 6-digit pincode"],
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    addressType: {
      type: String,
      enum: ["apartment", "independent_house", "office", "other"],
      default: "apartment",
    },
    instructions: { type: String, trim: true, maxlength: 300 },

    isDefault: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true, select: true },
  },
  {
    timestamps: true,
  },
);

addressSchema.index({ location: "2dsphere" });
addressSchema.index({ user: 1, isActive: 1 });

const Address = mongoose.model("Address", addressSchema);

export default Address;
