import { VendorService } from "../services/vendor.service.js";

export const VendorController = {
  getVendors: async (req, res) => {
    try {
      const result = await VendorService.getVendors(req.query);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  getVendorById: async (req, res) => {
    try {
      const vendor = await VendorService.getVendorById({
        user_id: req.params.id,
      });
      res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
        message: err.message,
      });
    }
  },

  addVendor: async (req, res) => {
    try {
      const vendor = await VendorService.addVendor(req.body);
      res.status(201).json({ success: true, data: vendor });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  updateVendor: async (req, res) => {
    try {
      const vendor = await VendorService.updateVendor({
        user_id: req.params.id,
        ...req.body,
      });
      res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
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
      res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
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
      res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
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
      res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
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
      res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
        message: err.message,
      });
    }
  },

  deleteVendor: async (req, res) => {
    try {
      const result = await VendorService.deleteVendor({
        user_id: req.params.id,
      });
      res
        .status(200)
        .json({ success: true, message: "Vendor deleted", data: result });
    } catch (err) {
      res.status(err.message === "Vendor not found" ? 404 : 400).json({
        success: false,
        message: err.message,
      });
    }
  },
};

export default VendorController;
