import { sendSuccess } from "../../helpers/response.helper.js";
import PaymentService from "../../services/payment.service.js";

export const PaymentController = {
  confirmCodPayment: async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { orderId } = req.params;
      const { paymentMethod } = req.body;

      const order = await PaymentService.confirmCodPayment(userId, orderId, {
        paymentMethod,
      });

      return sendSuccess(res, {
        message: "Order placed successfully",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  },
};

export default PaymentController;
