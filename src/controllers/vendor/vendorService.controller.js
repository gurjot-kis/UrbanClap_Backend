import * as vendorServiceService from "../../services/vendorService.service.js";

export const VendorServiceController = {
  addVendorServices: async (req, res) => {
    try {
      const result = await vendorServiceService.addVendorServices(
        req.user._id,
        req.body.service_ids,
      );
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  getMyServices: async (req, res) => {
    try {
      const data = await vendorServiceService.getMyServices(req.user._id);
      return res.status(200).json({
        success: true,
        message: "Services fetched successfully",
        data,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
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
      return res.status(200).json({
        success: true,
        message: `Service marked as ${vs.status} successfully`,
        data: vs,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
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
      return res.status(200).json({
        success: true,
        message: "Service removed successfully",
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },
};

export default VendorServiceController;
