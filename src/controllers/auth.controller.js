import { AuthService } from "../services/auth.service.js";
import { CartService } from "../services/cart.service.js";
import { addToBlacklist } from "../utils/token-blacklist.js";
import { ACCOUNT_DEACTIVATED_MESSAGE } from "../utils/user-status.js";

const authErrorStatus = (message) => {
  if (message === "Invalid credentials") return 401;
  if (message === ACCOUNT_DEACTIVATED_MESSAGE) return 403;
  return 400;
};

const buildFailureResponse = (res, code, message) => {
  res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

/** Read phone from JSON body, urlencoded body, or query (Postman/clients often miss Content-Type). */
const getPhoneFromRequest = (req) => {
  let body = req.body;

  if (typeof body === "string" && body.trim()) {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  if (!body || typeof body !== "object") {
    body = {};
  }

  const fromBody =
    body.phone ?? body.mobile ?? body.phone_number ?? body.phoneNumber ?? "";
  const fromQuery = req.query?.phone ?? req.query?.mobile ?? "";

  return String(fromBody || fromQuery || "").trim();
};

const getOtpFromRequest = (req) => {
  let body = req.body;
  if (typeof body === "string" && body.trim()) {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  if (!body || typeof body !== "object") {
    body = {};
  }
  return String(body.otp ?? body.OTP ?? req.query?.otp ?? "").trim();
};

const mergeGuestCartIfPresent = async (req, res, data) => {
  const guestId = req.cookies?.guestId;
  if (!guestId) return;
  await CartService.mergeGuestCartIntoUser({ user_id: data._id, guestId });
  res.clearCookie("guestId");
};

export const AuthController = {
  signup: async (req, res) => {
    try {
      const { email, password, fullName, phone, address } = req.body || {};

      const data = await AuthService.signup({
        email,
        password,
        fullName,
        phone,
        address,
      });

      await mergeGuestCartIfPresent(req, res, data);

      // Keeping your requested response shape.
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Login successful",
        data,
      });
    } catch (err) {
      const message = err?.message || "Signup failed";
      const statusCode = message === "User already exists" ? 409 : 400;
      return buildFailureResponse(res, statusCode, message);
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body || {};

      const data = await AuthService.login({
        email,
        password,
      });

      await mergeGuestCartIfPresent(req, res, data);

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Login successful",
        data,
      });
    } catch (err) {
      const message = err?.message || "Login failed";
      return buildFailureResponse(res, authErrorStatus(message), message);
    }
  },
  changePassword: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { newPassword, confirmnewPassword } = req.body || {};
      const data = await AuthService.changePassword({
        user_id,
        newPassword,
        confirmnewPassword,
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Password changed successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Password change failed";
      if (message === "User not found") {
        return buildFailureResponse(res, 404, message);
      }
      if (message === "Passwords do not match") {
        return buildFailureResponse(res, 401, message);
      }
      return buildFailureResponse(res, 400, message);
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body || {};
      const data = await AuthService.forgotPassword({ email });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "OTP sent to your email address",
        data,
      });
    } catch (err) {
      const message = err?.message || "Failed to send OTP";
      const statusCode =
        message === "No account found with this email" ? 404 : 400;
      return buildFailureResponse(res, statusCode, message);
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { email, otp } = req.body || {};
      const data = await AuthService.verifyOtp({ email, otp });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "OTP verified successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "OTP verification failed";
      const statusCode =
        message === "No account found with this email"
          ? 404
          : message === "OTP has expired"
            ? 410
            : 400;
      return buildFailureResponse(res, statusCode, message);
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { resetToken, newPassword, confirmPassword } = req.body || {};
      const data = await AuthService.resetPassword({
        resetToken,
        newPassword,
        confirmPassword,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Password reset successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Password reset failed";
      const statusCode =
        message === "Invalid or expired reset token" ? 400 : 400;
      return buildFailureResponse(res, statusCode, message);
    }
  },

  logout: (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      const [, token] = authHeader.split(" ");

      if (token) {
        addToBlacklist(token);
      }

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Logged out successfully",
        data: null,
      });
    } catch (_err) {
      return res.status(500).json({
        success: false,
        code: 500,
        message: "Logout failed",
        data: null,
      });
    }
  },
};

export default AuthController;
