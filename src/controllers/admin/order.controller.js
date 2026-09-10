import { sendSuccess } from "../../helpers/response.helper.js";
import OrderService from "../../services/order.service.js";

export const OrderController = {
  updateOrderStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      if (!status) {
        return sendError(res, {
          code: 400,
          message: "status is required",
        });
      }

      const order = await OrderService.updateOrderStatus(id, status, {
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
  },

  getAllOrdersAdmin: async (req, res, next) => {
    try {
      const { status, paymentStatus, search, page, limit } = req.query;

      const result = await OrderService.getAllOrdersAdmin({
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
  },
};

export default OrderController;
