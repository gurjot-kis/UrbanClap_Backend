import mongoose from "mongoose";
import crypto from "crypto";

const UserSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomUUID(),
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },

    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    dob: {
      type: String,
      default: null,
    },

    anniversaryDate: {
      type: String,
      default: null,
    },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    code: { type: String, default: "", trim: true },
    gst_number: { type: String, default: "", trim: true },
    role: {
      type: String,
      enum: ["SuperAdmin", "User", "Vendor"],
      default: "User",
      index: true,
    },
    status: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    googleId: { type: String, default: "", trim: true, index: true },
    facebookId: { type: String, default: "", trim: true, index: true },
    authProvider: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
      index: true,
    },
    profilePicture: { type: String, default: "" },
    passwordHash: { type: String, default: "" },
    resetOtp: { type: String, default: null },
    resetOtpExpiry: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    loginTwilioOtp: { type: String, default: null },
    loginTwilioOtpExpiry: { type: Date, default: null },

    profile_status: {
      type: String,
      enum: ["incomplete", "complete"],
      default: "incomplete",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    emailVerificationOtp: {
      type: String,
      default: null,
    },

    emailVerificationOtpExpiry: {
      type: Date,
      default: null,
    },

    pendingEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
    },

    // vendor-only fields
    vendorCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    ], // categories/skills this vendor can serve

    serviceableAreas: [
      {
        pincode: { type: String, trim: true },
        _id: false,
      },
    ],

    currentLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },

    isAvailableNow: { type: Boolean, default: false },
    isVendorVerified: { type: Boolean, default: false },
  },
  { timestamps: true },
);

UserSchema.index({ currentLocation: "2dsphere" });
UserSchema.index({ vendorCategories: 1 });

const User = mongoose.model("User", UserSchema);

export default User;
