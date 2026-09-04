import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import SlotBookingService from "../../services/slotBooking.service.js";

export const SlotbookingController = {
  fetchAvailableSlots: async (req, res) => {
    try {
      const userId = req.user._id;
      console.log("UserId <><><", userId);
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
};
