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
    // Optional for social login users (required for local auth).
    passwordHash: { type: String, default: "" },
    // Forgot-password OTP flow
    resetOtp: { type: String, default: null },
    resetOtpExpiry: { type: Date, default: null },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
    // Twilio phone-login OTP (separate from email forgot-password OTP)
    loginTwilioOtp: { type: String, default: null },
    loginTwilioOtpExpiry: { type: Date, default: null },
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);

export default User;
