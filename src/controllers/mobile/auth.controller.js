import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import { ACCOUNT_DEACTIVATED_MESSAGE } from "../../utils/user-status.js";
import AuthService from "../../services/auth.service.js";

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

export const AuthController = {
  loginTwilioOtp: async (req, res) => {
    try {
      const phone = getPhoneFromRequest(req);

      if (!phone) {
        return sendError(res, {
          code: 400,
          message:
            'phone is required. Send JSON: { "phone": "+919780007922" } with header Content-Type: application/json',
        });
      }

      const data = await AuthService.loginTwilioOtp({ phone });

      return sendSuccess(res, {
        message: data.is_new_user
          ? "Account created and OTP sent to your phone"
          : "OTP sent to your phone",
        data,
      });
    } catch (err) {
      const message = err?.message || "Failed to send OTP";
      const statusCode = message === ACCOUNT_DEACTIVATED_MESSAGE ? 403 : 400;
      return sendError(res, {
        code: statusCode,
        message,
      });
    }
  },

  loginTwilioOtpVerify: async (req, res) => {
    try {
      const phone = getPhoneFromRequest(req);
      const otp = getOtpFromRequest(req);

      if (!phone) {
        return sendError(res, {
          code: 400,
          message:
            'phone is required. Send JSON: { "phone": "+919780007922", "otp": "123456" } with Content-Type: application/json',
        });
      }

      if (!otp) {
        return sendError(res, {
          code: 400,
          message: "otp is required",
        });
      }

      const data = await AuthService.loginTwilioOtpVerify({ phone, otp });

      return sendSuccess(res, {
        message: "Login successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Login failed";
      const statusCode =
        message === ACCOUNT_DEACTIVATED_MESSAGE
          ? 403
          : message === "Invalid credentials"
            ? 401
            : message === "OTP has expired"
              ? 410
              : 400;
      return sendError(res, {
        code: statusCode,
        message,
      });
    }
  },
};

export default AuthController;
