import { sendSuccess } from "../helpers/response.helper.js";
import * as orderService from "../services/order.service.js";

export async function initiateOrder(req, res, next) {
  try {
    const userId = req.user._id;
    const { address_id, slotBooking_id, couponCode, notes } = req.body;

    const order = await orderService.initiateOrder(userId, {
      address_id,
      slotBooking_id,
      couponCode,
      notes,
    });

    return sendSuccess(res, {
      code: 201,
      message: "Order created. Please confirm a payment method to place it.",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const userId = req.user._id;
    const { status, page, limit } = req.query;

    const result = await orderService.getUserOrders(userId, {
      status,
      page,
      limit,
    });

    return sendSuccess(res, {
      code: 200,
      message: "Orders fetched successfully",
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const isAdmin = req.user.role === "SuperAdmin";

    const order = await orderService.getOrderById(userId, id, { isAdmin });

    return sendSuccess(res, {
      code: 200,
      message: "Order fetched successfully",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { reason } = req.body;

    const order = await orderService.cancelOrder(userId, id, { reason });

    return sendSuccess(res, {
      code: 200,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return sendError(res, {
        code: 400,
        message: "status is required",
      });
    }

    const order = await orderService.updateOrderStatus(id, status, {
      note,
      actor: req.user.role === "Vendor" ? "vendor" : "admin",
    });

    return sendSuccess(res, {
      code: 200,
      message: `Order status updated to "${status}"`,
      data: {
        _id: order._id,
        status: order.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllOrdersAdmin(req, res, next) {
  try {
    const { status, paymentStatus, search, page, limit } = req.query;

    const result = await orderService.getAllOrdersAdmin({
      status,
      paymentStatus,
      search,
      page,
      limit,
    });

    return sendSuccess(res, {
      code: 200,
      message: "Orders fetched successfully",
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  initiateOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
};
