import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import SlotBookingService from "../../services/slotBooking.service.js";

export const SlotbookingController = {
  checkCoverage: async (req, res) => {
    try {
      const userId = req.user._id;
      const { category_id, service_ids } = req.body;

      const result = await SlotBookingService.checkCoverage(
        userId,
        category_id,
        service_ids,
      );

      return sendSuccess(res, {
        code: 200,
        message: "Coverage checked successfully",
        data: result,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
        error: err.message,
      });
    }
  },

  fetchAvailableSlots: async (req, res) => {
    try {
      const userId = req.user._id;
      const { category_id } = req.query;

      const result = await SlotBookingService.getMobileSlots(
        userId,
        category_id,
      );

      return sendSuccess(res, {
        code: 200,
        message: "Slots fetched successfully",
        data: result,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
        error: err.message,
      });
    }
  },

  addSlotBooking: async (req, res) => {
    try {
      const booking = await SlotBookingService.createSlotBooking(
        req.user._id,
        req.body,
      );
      return sendSuccess(res, {
        message: "Booking created successfully",
        data: booking,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
      });
    }
  },

  updateSlotBooking: async (req, res) => {
    try {
      const booking = await SlotBookingService.updateSlotBooking(
        req.params.id,
        req.body,
      );
      return sendSuccess(res, {
        code: 200,
        message: "Booking updated successfully",
        data: booking,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
        error: err.message,
      });
    }
  },

  deleteSlotBooking: async (req, res) => {
    try {
      const force = req.query.force === "true";
      const booking = await slotBookingService.deleteSlotBooking(
        req.params.id,
        force,
      );
      return sendSuccess(res, {
        code: 200,
        message: "Booking deleted successfully",
        data: booking,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 500,
        message: err.message || "Something went wrong",
        error: err.message,
      });
    }
  },
};
