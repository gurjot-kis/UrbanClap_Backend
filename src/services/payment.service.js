import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import Cart from "../models/cart.model.js";
import { AppError } from "../helpers/app-error.js";
import { getOrderById } from "./order.service.js";

export async function confirmOrderPayment(userId, orderId, { paymentMethod }) {
  if (paymentMethod === "online") {
    throw new AppError(
      "Online payments are not available yet. Please use Cash on Delivery.",
      400,
    );
  }
  if (paymentMethod !== "cod") {
    throw new AppError("Invalid payment method.", 400);
  }

  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new AppError("Order not found.", 404);
  }
  if (order.status !== "payment_pending") {
    throw new AppError(
      `Order is already "${order.status}" — payment was already confirmed.`,
      400,
    );
  }

  const cart = await Cart.findOne({ user_id: userId });

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const [payment] = await Payment.create(
        [
          {
            user: userId,
            order_id: order._id,
            slotBooking_id: order.slotBooking_id || null,
            amount: order.pricing.grandTotal,
            method: "cod",
            provider: "none",
            status: "pending",
          },
        ],
        { session },
      );

      order.payment_id = payment._id;
      order.paymentMethod = "cod";
      order.status = "pending"; // order is now actually placed/booked
      order.statusHistory.push({
        status: "pending",
        note: "Payment method confirmed (COD), order placed",
      });
      await order.save({ session });

      // only clear the cart now that checkout has genuinely completed
      if (cart) {
        cart.items = [];
        cart.totalItems = 0;
        cart.totalPrice = 0;
        await cart.save({ session });
      }
    });
  } finally {
    session.endSession();
  }

  return getOrderById(userId, order._id);
}

export default {
  confirmOrderPayment,
};
