import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import Cart from "../models/cart.model.js";
import Address from "../models/address.model.js";
import SlotBooking from "../models/slot-booking.model.js";

// ---- helpers ---------------------------------------------------------

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

const ACTIVE_STATUSES = [
  "payment_pending",
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
];

const STATUS_TRANSITIONS = {
  payment_pending: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export async function initiateOrder(userId, payload) {
  const { address_id, slotBooking_id, couponCode, notes } = payload;

  if (!address_id) {
    throw new AppError("address_id is required.", 400);
  }

  const cart = await Cart.findOne({ user_id: userId });
  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty.", 400);
  }

  const address = await Address.findOne({
    _id: address_id,
    user: userId,
    isActive: true,
  });
  if (!address) {
    throw new AppError("Address not found for this user.", 404);
  }

  if (slotBooking_id) {
    const slot = await SlotBooking.findOne({
      _id: slotBooking_id,
      user: userId,
    });
    if (!slot) {
      throw new AppError("Slot booking not found for this user.", 404);
    }
  }

  // Build order items from the cart's own snapshot/pricing — cart is
  // already the source of truth for "what the user is buying right now".
  const items = cart.items.map((item) => ({
    product_id: item.product_id,
    snapshot: item.snapshot,
    variant: item.variant
      ? {
          key: item.variant.key,
          label: item.variant.label,
          image: item.variant.image,
        }
      : { key: null, label: null, image: null },
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    lineTotal: item.lineTotal,
  }));

  const itemsTotal = +items.reduce((sum, i) => sum + i.lineTotal, 0).toFixed(2);
  const taxAmount = 0; // plug in your tax logic here
  const deliveryFee = 0; // plug in delivery pricing logic here
  const discount = 0; // plug in coupon logic here
  const grandTotal = +(itemsTotal + taxAmount + deliveryFee - discount).toFixed(
    2,
  );

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: userId,
    address_id,
    slotBooking_id: slotBooking_id || null,
    items,
    pricing: { itemsTotal, taxAmount, deliveryFee, discount, grandTotal },
    couponCode: couponCode || null,
    paymentMethod: null,
    paymentStatus: "pending",
    status: "payment_pending",
    statusHistory: [
      {
        status: "payment_pending",
        note: "Order created, awaiting payment method",
      },
    ],
    notes: notes || "",
  });

  return order;
}

// export async function getUserOrders(
//   userId,
//   { status, page = 1, limit = 20 } = {},
// ) {
//   const query = { user: userId };
//   if (status) query.status = status;

//   const skip = (Number(page) - 1) * Number(limit);

//   const [orders, total] = await Promise.all([
//     Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
//     Order.countDocuments(query),
//   ]);

//   return {
//     orders,
//     pagination: {
//       page: Number(page),
//       limit: Number(limit),
//       total,
//       pages: Math.ceil(total / limit),
//     },
//   };
// }
export async function getUserOrders(
  userId,
  { status, page = 1, limit = 20 } = {},
) {
  const query = { user: userId };
  if (status) query.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .select(
        "orderNumber status paymentStatus paymentMethod pricing.grandTotal items.snapshot.name items.snapshot.mainImage items.quantity createdAt deliveredAt",
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(query),
  ]);

  const lean = orders.map((o) => {
    const firstItem = o.items?.[0];
    return {
      _id: o._id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      grandTotal: o.pricing?.grandTotal,
      itemsCount: o.items?.length || 0,
      previewItem: firstItem
        ? {
            name: firstItem.snapshot?.name,
            image: firstItem.snapshot?.mainImage,
          }
        : null,
      createdAt: o.createdAt,
      deliveredAt: o.deliveredAt,
    };
  });

  return {
    orders: lean,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function getOrderById(userId, orderId, { isAdmin = false } = {}) {
  const query = isAdmin ? { _id: orderId } : { _id: orderId, user: userId };
  const order = await Order.findOne(query).populate("payment_id");
  if (!order) {
    throw new AppError("Order not found.", 404);
  }
  return order;
}

export async function cancelOrder(userId, orderId, { reason } = {}) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  if (!ACTIVE_STATUSES.includes(order.status)) {
    throw new AppError(
      `Order in status "${order.status}" cannot be cancelled.`,
      400,
    );
  }

  order.status = "cancelled";
  order.statusHistory.push({
    status: "cancelled",
    note: reason || "Cancelled by user",
  });
  order.cancellation = {
    cancelledBy: "user",
    reason: reason || "",
    cancelledAt: new Date(),
    refundAmount: order.paymentStatus === "paid" ? order.pricing.grandTotal : 0,
  };

  // If it had already been paid (e.g. COD collected early, or a future
  // gateway payment), record the refund on the Payment side too.
  if (order.paymentStatus === "paid" && order.payment_id) {
    const payment = await Payment.findById(order.payment_id);
    if (payment) {
      payment.status = "refunded";
      payment.refunds.push({
        amount: payment.amount,
        reason: reason || "Order cancelled",
      });
      await payment.save();
    }
    order.paymentStatus = "refunded";
  }

  await order.save();
  return order;
}

export async function updateOrderStatus(
  orderId,
  newStatus,
  { note, actor = "admin" } = {},
) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  const allowedNext = STATUS_TRANSITIONS[order.status] || [];
  if (!allowedNext.includes(newStatus)) {
    throw new AppError(
      `Cannot move order from "${order.status}" to "${newStatus}".`,
      400,
    );
  }

  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, note: note || "" });

  if (newStatus === "delivered") {
    order.deliveredAt = new Date();

    if (order.paymentMethod === "cod" && order.paymentStatus === "pending") {
      order.paymentStatus = "paid";
      if (order.payment_id) {
        await Payment.findByIdAndUpdate(order.payment_id, {
          status: "paid",
          paidAt: new Date(),
        });
      }
    }
  }

  if (newStatus === "cancelled") {
    order.cancellation = {
      cancelledBy: actor,
      reason: note || "",
      cancelledAt: new Date(),
      refundAmount:
        order.paymentStatus === "paid" ? order.pricing.grandTotal : 0,
    };
  }

  await order.save();
  return order;
}

export async function getAllOrdersAdmin({
  status,
  paymentStatus,
  search,
  page = 1,
  limit = 20,
} = {}) {
  const query = {};

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (search) {
    query.$or = [{ orderNumber: { $regex: search, $options: "i" } }];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    Order.find(query)
      .select(
        "orderNumber status paymentStatus paymentMethod pricing.grandTotal user items createdAt",
      )
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(query),
  ]);

  const formattedOrders = orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    customer: o.user
      ? { _id: o.user._id, name: o.user.name, email: o.user.email }
      : null,
    totalItems: o.items?.length || 0,
    grandTotal: o.pricing?.grandTotal || 0,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return {
    orders: formattedOrders,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  };
}

export default {
  initiateOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
};
