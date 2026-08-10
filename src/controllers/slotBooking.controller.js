import * as slotBookingService from "../services/slotBooking.service.js";

export const addSlotBooking = async (req, res) => {
  try {
    const userId = req.user._id; 
    const booking = await slotBookingService.createSlotBooking(
      userId,
      req.body,
    );
    return res.status(200).json({
      success: true,
      statusCode: 201,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      statusCode: err.statusCode || 500,
      message: err.message || "Something went wrong",
    });
  }
};

export const getAllSlotBookings = async (req, res) => {
  try {
    const result = await slotBookingService.getAllSlotBookings(req.query);
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Bookings fetched successfully",
      data: result.bookings,
      pagination: result.pagination,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      statusCode: err.statusCode || 500,
      message: err.message || "Something went wrong",
    });
  }
};

export const updateSlotBooking = async (req, res) => {
  try {
    const booking = await slotBookingService.updateSlotBooking(
      req.params.id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Booking updated successfully",
      data: booking,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      statusCode: err.statusCode || 500,
      message: err.message || "Something went wrong",
    });
  }
};

export const deleteSlotBooking = async (req, res) => {
  try {
    const force = req.query.force === "true";
    const booking = await slotBookingService.deleteSlotBooking(
      req.params.id,
      force,
    );
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Booking deleted successfully",
      data: booking,
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      statusCode: err.statusCode || 500,
      message: err.message || "Something went wrong",
    });
  }
};
