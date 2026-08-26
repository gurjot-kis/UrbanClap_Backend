import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import UserService from "../../services/user.service.js";

export const UserController = {
  getMyProfile: async (req, res) => {
    try {
      const user_id = req.user?._id;

      const data = await UserService.getMyProfile({ user_id });

      return sendSuccess(res, {
        code: 200,
        message: "User details fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Failed to fetch user details";

      if (message === "User not found") {
        return sendError(res, {
          code: 404,
          message,
        });
      }

      return sendError(res, {
        code: 400,
        message,
      });
    }
  },

  updateUserProfile: async (req, res) => {
    try {
      const user_id = req.user?._id;

      const { name, email, phone, dob, anniversaryDate } = req.body || {};

      const data = await UserService.updateUserProfile({
        user_id,
        name,
        email,
        phone,
        dob,
        anniversaryDate,
      });

      if (data.emailVerificationSent) {
        return sendSuccess(res, {
          code: 200,
          message:
            "Profile updated. Please verify your new email address — OTP sent.",
        });
      }

      const { emailVerificationSent, ...responseData } = data;

      return sendSuccess(res, {
        message: "Profile updated successfully",
        data: responseData,
      });
    } catch (err) {
      const message = err?.message || "Profile update failed";

      if (message === "User not found") {
        return sendError(res, {
          code: 404,
          message,
        });
      }

      if (message === "Email already in use") {
        return sendError(res, {
          code: 409,
          message,
        });
      }

      return sendError(res, {
        code: 400,
        message,
      });
    }
  },

  verifyEmailOtp: async (req, res) => {
    try {
      const user_id = req.user?._id;
      const { otp } = req.body || {};

      const data = await UserService.verifyEmailOtp({ user_id, otp });

      return sendSuccess(res, {
        code: 200,
        message: "Email verified and updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "OTP verification failed";
      if (message === "OTP has expired")
        return sendError(res, { code: 410, message });
      if (message === "Invalid OTP")
        return sendError(res, { code: 400, message });
      return sendError(res, { code: 400, message });
    }
  },
};

export default UserController;
