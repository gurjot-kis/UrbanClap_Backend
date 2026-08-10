import * as paymentService from "../services/payment.service.js";

/**
 * PAYMENT CONTROLLER
 * Thin layer: parse request -> call service -> shape response.
 */

// Step 2 of checkout: payment method screen — creates Payment,
// places the order, clears the cart
export async function confirmOrderPayment(req, res, next) {
  try {
    const userId = req.user._id;
    const { orderId } = req.params;
    const { paymentMethod } = req.body;

    const order = await paymentService.confirmOrderPayment(userId, orderId, {
      paymentMethod,
    });

    return res.status(200).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  confirmOrderPayment,
};