import { sendSuccess } from "../../helpers/response.helper.js";
import OrderService from "../../services/order.service.js";

export const OrderController = {
  initiateOrder: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { address_id, slotBooking_ids, couponCode, notes } = req.body;

      const order = await OrderService.initiateOrder(userId, {
        address_id,
        slotBooking_ids,
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
  },

  getMyOrders: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { status, page, limit } = req.query;

      const result = await OrderService.getUserOrders(userId, {
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
  },

  getOrderById: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const isAdmin = req.user.role === "SuperAdmin";

      const order = await OrderService.getOrderById(userId, id, { isAdmin });

      return sendSuccess(res, {
        code: 200,
        message: "Order fetched successfully",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },

  cancelOrder: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { id } = req.params;
      const { reason } = req.body;

      const order = await OrderService.cancelOrder(userId, id, { reason });

      return sendSuccess(res, {
        code: 200,
        message: "Order cancelled successfully",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default OrderController;
