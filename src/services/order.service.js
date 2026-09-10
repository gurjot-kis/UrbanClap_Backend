import mongoose from "mongoose";
import Order from "../models/order.model.js";
import Payment from "../models/payment.model.js";
import Cart from "../models/cart.model.js";
import Address from "../models/address.model.js";
import SlotBooking from "../models/slot-booking.model.js";
import VendorSlot from "../models/vendor-slot.model.js";

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

export const OrderService = {
  initiateOrder: async (userId, payload) => {
    const { address_id, slotBooking_ids, couponCode, notes } = payload;

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

    // Validate and load all slot bookings if provided
    let slotBookings = [];
    if (slotBooking_ids && slotBooking_ids.length > 0) {
      slotBookings = await SlotBooking.find({
        _id: { $in: slotBooking_ids },
        user: userId,
      });

      if (slotBookings.length !== slotBooking_ids.length) {
        throw new AppError(
          "One or more slot bookings not found for this user.",
          404,
        );
      }
    }

    // Build a map: product_id (string) -> slotBooking._id
    // Each slot booking has items[], each item has product_id
    const productToSlotMap = new Map();
    for (const slot of slotBookings) {
      for (const slotItem of slot.items) {
        productToSlotMap.set(slotItem.product_id.toString(), slot._id);
      }
    }

    // Build order items — attach matched slotBooking_id per item if found
    const items = cart.items.map((item) => {
      const matchedSlotId =
        productToSlotMap.get(item.product_id.toString()) || null;

      return {
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
        slotBooking_id: matchedSlotId, // null for non-service cart items
      };
    });

    const itemsTotal = +items
      .reduce((sum, i) => sum + i.lineTotal, 0)
      .toFixed(2);
    const taxAmount = 0;
    const deliveryFee = 0;
    const discount = 0;
    const grandTotal = +(
      itemsTotal +
      taxAmount +
      deliveryFee -
      discount
    ).toFixed(2);

    // Collect unique slot booking IDs actually matched to items
    const matchedSlotIds = [
      ...new Set(
        items
          .map((i) => i.slotBooking_id)
          .filter(Boolean)
          .map((id) => id.toString()),
      ),
    ].map((id) => new mongoose.Types.ObjectId(id));

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: userId,
      address_id,
      slotBooking_ids: matchedSlotIds, // array on the order (see schema change below)
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
  },

  getUserOrders: async (userId, { status, page = 1, limit = 20 } = {}) => {
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
  },

  getOrderById: async (userId, orderId, { isAdmin = false } = {}) => {
    const query = isAdmin ? { _id: orderId } : { _id: orderId, user: userId };
    const order = await Order.findOne(query).populate("payment_id");
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    return order;
  },

  cancelOrder: async (userId, orderId, { reason } = {}) => {
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

    // ---- 1. Release vendor slots linked to this order's slot bookings --------
    if (order.slotBooking_ids?.length > 0) {
      const slotBookings = await SlotBooking.find({
        _id: { $in: order.slotBooking_ids },
      }).select("scheduleDetails.vendorSlotId vendor_id status");

      const vendorSlotIds = slotBookings
        .map((sb) => sb.scheduleDetails?.vendorSlotId)
        .filter(Boolean);

      if (vendorSlotIds.length > 0) {
        await VendorSlot.updateMany(
          { _id: { $in: vendorSlotIds }, bookedCount: { $gt: 0 } },
          { $inc: { bookedCount: -1 } },
        );

        await VendorSlot.updateMany(
          {
            _id: { $in: vendorSlotIds },
            status: "blocked",
            $expr: { $gte: ["$capacity", "$bookedCount"] },
          },
          { $set: { status: "available" } },
        );
      }

      await SlotBooking.updateMany(
        { _id: { $in: order.slotBooking_ids } },
        {
          $set: {
            status: "cancelled",
            "cancellation.cancelledBy": "user",
            "cancellation.reason": reason || "Order cancelled by user",
            "cancellation.cancelledAt": new Date(),
            "cancellation.refundAmount":
              order.paymentStatus === "paid" ? order.pricing.grandTotal : 0,
          },
        },
      );
    }

    // ---- 2. Update order -------------------------------------------------------
    order.status = "cancelled";
    order.statusHistory.push({
      status: "cancelled",
      note: reason || "Cancelled by user",
    });
    order.cancellation = {
      cancelledBy: "user",
      reason: reason || "",
      cancelledAt: new Date(),
      refundAmount:
        order.paymentStatus === "paid" ? order.pricing.grandTotal : 0,
    };

    // ---- 3. Handle refund if already paid -------------------------------------
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
  },

  updateOrderStatus: async (
    orderId,
    newStatus,
    { note, actor = "admin" } = {},
  ) => {
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
  },

  getAllOrdersAdmin: async ({
    status,
    paymentStatus,
    search,
    page = 1,
    limit = 20,
  } = {}) => {
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
  },
};

export default OrderService;
