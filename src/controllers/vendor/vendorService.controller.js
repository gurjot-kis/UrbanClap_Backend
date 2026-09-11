import * as vendorServiceService from "../../services/vendorService.service.js";
import { sendError, sendSuccess } from "../../helpers/response.helper.js";

export const VendorServiceController = {
  getMyServices: async (req, res) => {
    try {
      const result = await vendorServiceService.getMyServices(
        req.user._id,
        req.query,
      );

      return sendSuccess(res, {
        message: "Services fetched successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
    }
  },

  getAllMyServicesWithoutPagination: async (req, res) => {
    try {
      const data = await vendorServiceService.getAllMyServices(
        req.user._id,
        req.query,
      );

      return sendSuccess(res, {
        message: "All services fetched successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
    }
  },

  addVendorServices: async (req, res) => {
    try {
      const result = await vendorServiceService.addVendorServices(
        req.user._id,
        req.body.service_ids,
      );

      return sendSuccess(res, {
        code: 201,
        message: result.message,
        data: result,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
    }
  },

  toggleVendorService: async (req, res) => {
    try {
      const vs = await vendorServiceService.toggleVendorService(
        req.user._id,
        req.params.service_id,
      );

      return sendSuccess(res, {
        message: `Service marked as ${vs.status} successfully`,
        data: vs,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
    }
  },

  removeVendorService: async (req, res) => {
    try {
      await vendorServiceService.removeVendorService(
        req.user._id,
        req.params.service_id,
      );

      return sendSuccess(res, {
        message: "Service removed successfully",
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
    }
  },
};

export default VendorServiceController;
