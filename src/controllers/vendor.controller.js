import { sendError, sendSuccess } from "../helpers/response.helper.js";
import { VendorService } from "../services/vendor.service.js";

export const VendorController = {
  getVendors: async (req, res) => {
    try {
      const result = await VendorService.getVendors(req.query);
      return sendSuccess(res, {
        code: 200,
        message: "Vendors fetched successfully",
        data: result.vendors,
        pagination: result.pagination,
      });
    } catch (err) {
      return sendError(res, {
        code: 500,
        message: err.message || "Failed to fetch vendors",
      });
    }
  },

  getVendorById: async (req, res) => {
    try {
      const vendor = await VendorService.getVendorById({
        user_id: req.params.id,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor fetched successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  addVendor: async (req, res) => {
    try {
      const vendor = await VendorService.addVendor(req.body);
      return sendSuccess(res, {
        code: 201,
        message: "Vendor added successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: 400,
        message: err.message,
      });
    }
  },

  updateVendor: async (req, res) => {
    try {
      const vendor = await VendorService.updateVendor({
        user_id: req.params.id,
        ...req.body,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor updated successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  updateVendorStatus: async (req, res) => {
    try {
      const vendor = await VendorService.updateVendorStatus({
        user_id: req.params.id,
        status: req.body.status,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor status updated successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  updateVendorVerification: async (req, res) => {
    try {
      const vendor = await VendorService.updateVendorVerification({
        user_id: req.params.id,
        isVendorVerified: req.body.isVendorVerified,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor verification status updated successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  updateVendorAvailability: async (req, res) => {
    try {
      const vendor = await VendorService.updateVendorAvailability({
        user_id: req.params.id,
        isAvailableNow: req.body.isAvailableNow,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor availability updated successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  updateVendorLocation: async (req, res) => {
    try {
      const vendor = await VendorService.updateVendorLocation({
        user_id: req.params.id,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor location updated successfully",
        data: vendor,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  deleteVendor: async (req, res) => {
    try {
      const result = await VendorService.deleteVendor({
        user_id: req.params.id,
      });
      return sendSuccess(res, {
        code: 200,
        message: "Vendor deleted successfully",
        data: result,
      });
    } catch (err) {
      return sendError(res, {
        code: err.message === "Vendor not found" ? 404 : 400,
        message: err.message,
      });
    }
  },

  // Vendor Profile
  getProfile: async (req, res) => {
    try {
      const { user_id } = req.user;
      console.log("user_id", user_id);

      const data = await VendorService.getProfile({ user_id });

      return sendSuccess(res, {
        code: 200,
        message: "Vendor profile fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch vendor profile";

      if (message === "Vendor not found") {
        return sendError(res, {
          code: 404,
          message,
        });
      }

      return sendError(res, {
        code: 500,
        message,
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { user_id } = req.user;

      const { name, email, phone, address, gst, code, password } = req.body || {};

      const profilePicture = req.file
        ? `/uploads/vendor/${req.file.filename}`
        : undefined;

      const data = await VendorService.updateProfile({
        user_id,
        name,
        email,
        phone,
        address,
        gst,
        code,
        password,
        profilePicture,
      });

      return sendSuccess(res, {
        code: 200,
        message: "Vendor profile updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Vendor profile update failed";

      if (message === "Vendor not found") {
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
};

export default VendorController;
