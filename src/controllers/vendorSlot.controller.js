import * as vendorSlotService from "../services/vendorSlot.service.js";

export const addVendorSlot = async (req, res) => {
  try {
    const slot = await vendorSlotService.createVendorSlot(req.body);
    return res
      .status(200)
      .json({
        success: true,
        statusCode: 201,
        message: "Slot created successfully",
        data: slot,
      });
  } catch (err) {
    return res
      .status(200)
      .json({
        success: false,
        statusCode: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
  }
};

export const getAllVendorSlots = async (req, res) => {
  try {
    const result = await vendorSlotService.getAllVendorSlots(req.query);
    return res
      .status(200)
      .json({
        success: true,
        statusCode: 200,
        message: "Slots fetched successfully",
        data: result.slots,
        pagination: result.pagination,
      });
  } catch (err) {
    return res
      .status(200)
      .json({
        success: false,
        statusCode: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
  }
};

export const updateVendorSlot = async (req, res) => {
  try {
    const slot = await vendorSlotService.updateVendorSlot(
      req.params.id,
      req.body,
    );
    return res
      .status(200)
      .json({
        success: true,
        statusCode: 200,
        message: "Slot updated successfully",
        data: slot,
      });
  } catch (err) {
    return res
      .status(200)
      .json({
        success: false,
        statusCode: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
  }
};

export const deleteVendorSlot = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const slot = await vendorSlotService.deleteVendorSlot(req.params.id, force);
    return res
      .status(200)
      .json({
        success: true,
        statusCode: 200,
        message: "Slot deleted successfully",
        data: slot,
      });
  } catch (err) {
    return res
      .status(200)
      .json({
        success: false,
        statusCode: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
  }
};
