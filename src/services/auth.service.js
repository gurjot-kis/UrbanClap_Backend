import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import { sendEmail } from "../utils/email.js";
import { sendTwilioSms } from "../utils/twilio-sms.js";
import { assertUserCanLogin, mapUserStatus } from "../utils/user-status.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "365d";

const signAuthToken = (user) => {
  // Payload matches the keys you showed: `user_id`, `email`.
  return jwt.sign(
    {
      _id: user._id.toString(),
      user_id: user.user_id,
      email: user.email,
      role: user.role || "User",
    },
    JWT_SECRET,
    { algorithm: "HS256", expiresIn: JWT_EXPIRES_IN },
  );
};

const digitsOnly = (v) => String(v || "").replace(/\D/g, "");

const findUserByPhone = async (rawPhone) => {
  const d = digitsOnly(rawPhone);
  if (!d) return null;
  const last10 = d.length >= 10 ? d.slice(-10) : d;
  return User.findOne({
    $or: [
      { phone: String(rawPhone).trim() },
      { phone: d },
      { phone: last10 },
      { phone: `+91${last10}` },
      { phone: `91${last10}` },
    ],
  }).exec();
};

const phoneToE164 = (rawPhone) => {
  const d = digitsOnly(rawPhone);
  const cc = String(process.env.TWILIO_DEFAULT_COUNTRY_CODE || "91").replace(
    /\D/g,
    "",
  );
  if (!d) return "";
  if (
    String(rawPhone || "")
      .trim()
      .startsWith("+")
  ) {
    return `+${d}`;
  }
  if (d.length === 10) return `+${cc}${d}`;
  return `+${d}`;
};

const buildAuthResponseData = (user, token) => {
  return {
    _id: user._id.toString(),
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    role: user.role || "User",
    status: mapUserStatus(user.status),
    profilePicture: user.profilePicture || "",
    token,
  };
};

const sendLoginTwilioOtpToUser = async (user, phone) => {
  assertUserCanLogin(user);

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.loginTwilioOtp = otp;
  user.loginTwilioOtpExpiry = otpExpiry;
  await user.save();

  const to = phoneToE164(phone);
  try {
    const result = await sendTwilioSms(
      to,
      `Your login OTP is ${otp}. It is valid for 10 minutes. Do not share this code.`,
    );

    if (!result.sent) {
      user.loginTwilioOtp = null;
      user.loginTwilioOtpExpiry = null;
      await user.save();
      throw new Error("SMS could not be sent. Check Twilio configuration.");
    }
  } catch (e) {
    user.loginTwilioOtp = null;
    user.loginTwilioOtpExpiry = null;
    await user.save();
    if (e?.message === "SMS could not be sent. Check Twilio configuration.")
      throw e;
    throw new Error(e?.message || "Failed to send SMS");
  }

  return { phone: to };
};

const findOrCreateUserByPhone = async (rawPhone) => {
  let user = await findUserByPhone(rawPhone);
  if (user) {
    return { user, is_new_user: false };
  }

  const e164 = phoneToE164(rawPhone);
  const digits = digitsOnly(rawPhone);
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  let email = `phone_${last10 || digits}@otp.local`;

  const emailTaken = await User.findOne({ email }).exec();
  if (emailTaken) {
    email = `phone_${last10 || digits}_${crypto.randomBytes(4).toString("hex")}@otp.local`;
  }

  user = await User.create({
    name: "User",
    email,
    phone: e164,
    role: "User",
    passwordHash: "",
  });

  return { user, is_new_user: true };
};

const verifyLoginTwilioOtp = async (user, otp) => {
  if (!user.loginTwilioOtp || !user.loginTwilioOtpExpiry) {
    throw new Error("OTP not requested or already used");
  }
  if (new Date() > user.loginTwilioOtpExpiry) {
    throw new Error("OTP has expired");
  }
  if (user.loginTwilioOtp !== String(otp).trim()) {
    throw new Error("Invalid OTP");
  }

  assertUserCanLogin(user);

  user.loginTwilioOtp = null;
  user.loginTwilioOtpExpiry = null;
  await user.save();

  const token = signAuthToken(user);
  return buildAuthResponseData(user, token);
};

export const AuthService = {
  signup: async ({ email, password, fullName, phone, address }) => {
    if (!email || !password || !fullName) {
      throw new Error("Email, password, and fullName are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedFullName = String(fullName).trim();

    const existingUser = await User.findOne({ email: normalizedEmail }).exec();
    if (existingUser) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      email: normalizedEmail,
      name: normalizedFullName,
      phone: phone ? String(phone) : "",
      address: address ? String(address) : "",
      role: "User",
      passwordHash,
    });

    const token = signAuthToken(user);
    return buildAuthResponseData(user, token);
  },

  changePassword: async ({ user_id, newPassword, confirmnewPassword }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }
    if (!newPassword || !confirmnewPassword) {
      throw new Error("newPassword and confirmnewPassword are required");
    }
    if (String(newPassword).trim() !== String(confirmnewPassword).trim()) {
      throw new Error("Passwords do not match");
    }
    if (String(newPassword).trim().length < 6) {
      throw new Error("New password must be at least 6 characters");
    }

    const user = await User.findOne({ user_id: String(user_id).trim() }).exec();
    if (!user) {
      throw new Error("User not found");
    }

    user.passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
    await user.save();

    return {
      user_id: user.user_id,
      email: user.email,
    };
  },

  forgotPassword: async ({ email }) => {
    if (!email) throw new Error("Email is required");

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).exec();
    if (!user) throw new Error("No account found with this email");

    // Generate a 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetOtp = otp;
    user.resetOtpExpiry = otpExpiry;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    await sendEmail({
      to: normalizedEmail,
      subject: "Your Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`,
      html: `<p>Your OTP for password reset is:</p><h2>${otp}</h2><p>This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>`,
    });

    return { email: normalizedEmail };
  },

  verifyOtp: async ({ email, otp }) => {
    if (!email || !otp) throw new Error("Email and OTP are required");

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).exec();
    if (!user) throw new Error("No account found with this email");

    if (!user.resetOtp || !user.resetOtpExpiry) {
      throw new Error("OTP not requested or already used");
    }
    if (new Date() > user.resetOtpExpiry) {
      throw new Error("OTP has expired");
    }
    if (user.resetOtp !== String(otp).trim()) {
      throw new Error("Invalid OTP");
    }

    // OTP is valid — issue a short-lived reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetOtp = null;
    user.resetOtpExpiry = null;
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    return { resetToken };
  },

  resetPassword: async ({ resetToken, newPassword, confirmPassword }) => {
    if (!resetToken) throw new Error("Reset token is required");
    if (!newPassword || !confirmPassword) {
      throw new Error("newPassword and confirmPassword are required");
    }
    if (String(newPassword).trim() !== String(confirmPassword).trim()) {
      throw new Error("Passwords do not match");
    }
    if (String(newPassword).trim().length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const user = await User.findOne({
      resetToken: String(resetToken).trim(),
    }).exec();
    if (!user) throw new Error("Invalid or expired reset token");
    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new Error("Invalid or expired reset token");
    }

    user.passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return { email: user.email };
  },

  login: async ({ email, password }) => {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).exec();

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    assertUserCanLogin(user);

    const token = signAuthToken(user);
    return buildAuthResponseData(user, token);
  },

  loginTwilio: async ({ phone, password }) => {
    if (!phone || !password) {
      throw new Error("phone and password are required");
    }

    const user = await findUserByPhone(phone);
    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    return sendLoginTwilioOtpToUser(user, phone);
  },

  /** Phone-only OTP: registers if new, otherwise sends login OTP. */
  loginTwilioOtp: async ({ phone }) => {
    if (!phone || !String(phone).trim()) {
      throw new Error("phone is required");
    }

    const { user, is_new_user } = await findOrCreateUserByPhone(phone);
    const result = await sendLoginTwilioOtpToUser(user, phone);

    return {
      ...result,
      is_new_user,
    };
  },

  loginTwilioVerify: async ({ phone, password, otp }) => {
    if (!phone || !password || !otp) {
      throw new Error("phone, password, and otp are required");
    }

    const user = await findUserByPhone(phone);
    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(String(password), user.passwordHash);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    return verifyLoginTwilioOtp(user, otp);
  },

  /** Verify phone-only OTP login (no password). */
  loginTwilioOtpVerify: async ({ phone, otp }) => {
    if (!phone || !otp) {
      throw new Error("phone and otp are required");
    }

    const user = await findUserByPhone(phone);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    return verifyLoginTwilioOtp(user, otp);
  },
};

export default AuthService;
