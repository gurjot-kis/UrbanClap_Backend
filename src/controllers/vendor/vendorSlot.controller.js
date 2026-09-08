import vendorSlotService from "../../services/vendorSlot.service.js";

export const VendorController = {
  getMyVendorSlots: async (req, res) => {
    try {
      const result = await vendorSlotService.getVendorSlots(
        req.user._id,
        req.query,
      );
      return res.status(200).json({
        success: true,
        message: "Vendor slots fetched successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  getVendorSlotById: async (req, res) => {
    try {
      const slot = await vendorSlotService.getVendorSlotById(
        req.params.id,
        req.user._id,
      );
      return res.status(200).json({
        success: true,
        message: "Vendor slot fetched successfully",
        data: slot,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  addVendorSlot: async (req, res) => {
    try {
      const vendor_id = req.user._id;
      const slot = await vendorSlotService.createVendorSlot({
        ...req.body,
        vendor_id,
      });
      return res.status(201).json({
        success: true,
        message: "Slot created successfully",
        data: slot,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  updateVendorSlot: async (req, res) => {
    try {
      const slot = await vendorSlotService.updateVendorSlot(
        req.params.id,
        req.body,
      );
      return res.status(200).json({
        success: true,
        message: "Slot updated successfully",
        data: slot,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  updateVendorSlotAvailability: async (req, res) => {
    try {
      const slot = await vendorSlotService.updateVendorSlotAailability(
        req.params.id,
      );
      return res.status(200).json({
        success: true,
        message: `Slot marked as ${slot.status} successfully`,
        data: slot,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },

  deleteVendorSlot: async (req, res) => {
    try {
      const force = req.query.force === "true";
      await vendorSlotService.deleteVendorSlot(req.params.id, force);
      return res.status(200).json({
        success: true,
        message: "Slot deleted successfully",
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Something went wrong",
      });
    }
  },
};

export default VendorController;
