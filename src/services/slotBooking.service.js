import mongoose from "mongoose";
import SlotBooking from "../models/slot-booking.model.js";
import VendorSlot from "../models/vendor-slot.model.js";
import Product from "../models/product.model.js";
import Address from "../models/address.model.js";
import Category from "../models/category.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// === helpers ===

const resolveLineItem = (product, variantKey, quantity) => {
  if (quantity > product.maxQuantity) {
    throw {
      statusCode: 400,
      message: `Quantity cannot exceed ${product.maxQuantity} for "${product.name}"`,
    };
  }
  if (product.variants?.length > 0 && !variantKey) {
    throw {
      statusCode: 400,
      message: `Please select a ${product.variantLabel || "variant"} for "${product.name}"`,
    };
  }

  let variant = null;
  let unitPrice = product.basePrice;

  if (variantKey) {
    variant = product.variants.find((v) => v.key === variantKey);
    if (!variant) {
      throw {
        statusCode: 400,
        message: `Invalid variant key for "${product.name}"`,
      };
    }
    unitPrice = variant.price;
  }

  return {
    product_id: product._id,
    variant: variant
      ? { key: variant.key, label: variant.label, price: variant.price }
      : { key: null, label: null, price: null },
    basePrice: unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
    duration: product.durationMinutes * quantity,
    category_id: product.category_id,
    sub_category_id: product.sub_category_id,
  };
};

const resolveServiceAddress = async (
  userId,
  address_id,
  rawServiceAddress,
  rawLocation,
) => {
  if (address_id) {
    if (!isValidObjectId(address_id)) {
      throw { statusCode: 400, message: "Invalid address_id" };
    }

    const addressDoc = await Address.findOne({
      _id: address_id,
      user: userId,
      isActive: true,
    });
    if (!addressDoc) throw { statusCode: 404, message: "Address not found" };

    const coords = addressDoc.location?.coordinates;
    if (!coords || (coords[0] === 0 && coords[1] === 0)) {
      throw {
        statusCode: 400,
        message:
          "This address has no location set. Please update it or add a new address.",
      };
    }

    return {
      serviceAddress: {
        contactName: addressDoc.contactName,
        contactPhone: addressDoc.contactPhone,
        addressLine1: addressDoc.houseNo
          ? `${addressDoc.houseNo}, ${addressDoc.addressLine1}`
          : addressDoc.addressLine1,
        addressLine2: addressDoc.addressLine2 || "",
        landmark: addressDoc.landmark || "",
        city: addressDoc.city,
        state: addressDoc.state,
        pincode: addressDoc.pincode,
      },
      location: { coordinates: coords },
    };
  }

  // one-off address, no saved Address doc
  if (
    !rawServiceAddress ||
    !rawServiceAddress.contactName ||
    !rawServiceAddress.contactPhone ||
    !rawServiceAddress.addressLine1 ||
    !rawServiceAddress.city ||
    !rawServiceAddress.state ||
    !rawServiceAddress.pincode
  ) {
    throw {
      statusCode: 400,
      message: "serviceAddress is required when no address_id is given",
    };
  }
  if (
    !rawLocation ||
    !Array.isArray(rawLocation.coordinates) ||
    rawLocation.coordinates.length !== 2
  ) {
    throw {
      statusCode: 400,
      message: "location.coordinates [lng, lat] is required",
    };
  }

  return { serviceAddress: rawServiceAddress, location: rawLocation };
};

const claimVendorSlot = async (vendorSlotId) => {
  const slot = await VendorSlot.findOneAndUpdate(
    { _id: vendorSlotId, status: "available" },
    { $set: { status: "booked" } },
    { new: true },
  );
  if (!slot) {
    throw {
      statusCode: 409,
      message: "This slot is no longer available. Please pick another.",
    };
  }
  return slot;
};

const releaseVendorSlot = async (vendorSlotId) => {
  if (!vendorSlotId) return;
  await VendorSlot.findByIdAndUpdate(vendorSlotId, {
    $set: { status: "available", booking_id: null },
  });
};

// Walks upward from a category, collecting itself + every ancestor's id.
// Stops safely if a category in the chain is missing (deleted/bad data).
const getCategoryAncestryChain = async (categoryId) => {
  const chain = [];
  let currentId = categoryId;

  while (currentId) {
    chain.push(String(currentId));
    const cat = await Category.findById(currentId).select("parent_id");
    if (!cat) break;
    currentId = cat.parent_id;
  }

  return chain; // [self, parent, grandparent, ...]
};

// A vendor slot is valid for a target category if the slot's category is:
//  - the target's own category, OR
//  - an ancestor of it (vendor qualified at a broader level), OR
//  - a descendant of it (slot seeded more specifically than the target)
const isSlotCategoryValidForTarget = async (
  slotCategoryId,
  targetCategoryId,
  targetSubCategoryId,
) => {
  const target = targetSubCategoryId || targetCategoryId;

  if (String(slotCategoryId) === String(target)) return true;

  const targetChain = await getCategoryAncestryChain(target);
  if (targetChain.includes(String(slotCategoryId))) return true;

  const slotChain = await getCategoryAncestryChain(slotCategoryId);
  return slotChain.includes(String(target));
};



export const createSlotBooking = async (userId, payload) => {
  const {
    cartItems,
    slotType,
    address_id,
    serviceAddress: rawServiceAddress,
    location: rawLocation,
    slotId,
  } = payload;

  if (!isValidObjectId(userId))
    throw { statusCode: 401, message: "Unauthorized" };
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw { statusCode: 400, message: "cartItems must be a non-empty array" };
  }
  if (!["instant", "schedule"].includes(slotType)) {
    throw {
      statusCode: 400,
      message: "slotType must be 'instant' or 'schedule'",
    };
  }
  for (const item of cartItems) {
    if (!isValidObjectId(item.product_id)) {
      throw { statusCode: 400, message: "Invalid product_id in cartItems" };
    }
  }

  const productIds = cartItems.map((i) => i.product_id);
  const products = await Product.find({
    _id: { $in: productIds },
    status: "active",
  });
  if (products.length !== new Set(productIds.map(String)).size) {
    throw {
      statusCode: 404,
      message: "One or more products not found or inactive",
    };
  }
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const resolvedItems = cartItems.map((item) => {
    const product = productMap.get(String(item.product_id));
    if (!product)
      throw {
        statusCode: 404,
        message: `Product ${item.product_id} not found`,
      };
    return resolveLineItem(product, item.variantKey, item.quantity || 1);
  });

  const categoryIds = new Set(resolvedItems.map((i) => String(i.category_id)));
  if (categoryIds.size > 1) {
    throw {
      statusCode: 400,
      message: "All items in a single booking must belong to the same category",
    };
  }

  const category_id = resolvedItems[0].category_id;
  const sub_category_id = resolvedItems[0].sub_category_id;
  const totalAmount = resolvedItems.reduce((sum, i) => sum + i.lineTotal, 0);
  const totalDuration = resolvedItems.reduce((sum, i) => sum + i.duration, 0);

  const { serviceAddress, location } = await resolveServiceAddress(
    userId,
    address_id,
    rawServiceAddress,
    rawLocation,
  );

  let bookingData = {
    user: userId, // from auth middleware, never from payload
    items: resolvedItems.map(
      ({ product_id, variant, basePrice, quantity, lineTotal }) => ({
        product_id,
        variant,
        basePrice,
        quantity,
        lineTotal,
      }),
    ),
    category_id,
    sub_category_id,
    slotType,
    duration: totalDuration,
    address_id: address_id || null,
    serviceAddress,
    location: { type: "Point", coordinates: location.coordinates },
    totalAmount,
    vendor_id: null,
  };

  if (slotType === "schedule") {
    if (!slotId || !isValidObjectId(slotId)) {
      throw {
        statusCode: 400,
        message: "slotId is required for a schedule booking",
      };
    }

    const claimedSlot = await claimVendorSlot(slotId);

    const validCategory = await isSlotCategoryValidForTarget(
      claimedSlot.category_id,
      category_id,
      sub_category_id,
    );
    if (!validCategory) {
      await releaseVendorSlot(claimedSlot._id);
      throw {
        statusCode: 400,
        message: "Selected slot does not offer this category",
      };
    }

    bookingData.vendor_id = claimedSlot.vendor_id;
    bookingData.scheduleDetails = {
      date: claimedSlot.date,
      day: DAY_NAMES[new Date(claimedSlot.date).getUTCDay()],
      startTime: claimedSlot.startTime,
      endTime: claimedSlot.endTime,
      vendorSlotId: claimedSlot._id,
    };
    bookingData.status = "confirmed";

    try {
      const booking = await SlotBooking.create(bookingData);
      await VendorSlot.findByIdAndUpdate(claimedSlot._id, {
        $set: { booking_id: booking._id },
      });
      return booking;
    } catch (err) {
      await releaseVendorSlot(claimedSlot._id); // rollback the claim if booking creation failed
      throw err;
    }
  }

  // instant booking — no specific slot to claim yet, vendor gets matched separately
  bookingData.instantDetails = {
    requestedAt: new Date(),
    expectedArrivalTime: null,
    assignedAt: null,
  };
  bookingData.status = "pending";

  return SlotBooking.create(bookingData);
};

// === READ ===

export const getAllSlotBookings = async (query) => {
  const {
    user,
    vendor_id,
    category_id,
    status,
    slotType,
    from_date,
    to_date,
    lat,
    lng,
    radiusKm,
    page = 1,
    limit = 20,
  } = query;

  const filter = {};

  if (user) {
    if (!isValidObjectId(user))
      throw { statusCode: 400, message: "Invalid user id" };
    filter.user = user;
  }
  if (vendor_id) {
    if (!isValidObjectId(vendor_id))
      throw { statusCode: 400, message: "Invalid vendor_id" };
    filter.vendor_id = vendor_id;
  }
  if (category_id) {
    if (!isValidObjectId(category_id))
      throw { statusCode: 400, message: "Invalid category_id" };
    filter.category_id = category_id;
  }
  if (status) filter.status = status;
  if (slotType) filter.slotType = slotType;

  if (from_date || to_date) {
    filter["scheduleDetails.date"] = {};
    if (from_date) filter["scheduleDetails.date"].$gte = new Date(from_date);
    if (to_date) filter["scheduleDetails.date"].$lte = new Date(to_date);
  }

  if (lat && lng) {
    filter.location = {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: (Number(radiusKm) || 10) * 1000,
      },
    };
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    SlotBooking.find(filter)
      .populate("user", "name email phone")
      .populate("vendor_id", "name email phone")
      .populate("items.product_id", "name mainImage")
      .populate("category_id", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    SlotBooking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

// === UPDATE ===

export const updateSlotBooking = async (id, payload) => {
  if (!isValidObjectId(id))
    throw { statusCode: 400, message: "Invalid booking id" };

  const booking = await SlotBooking.findById(id);
  if (!booking) throw { statusCode: 404, message: "Booking not found" };

  if (["completed", "cancelled"].includes(booking.status) && !payload.force) {
    throw {
      statusCode: 400,
      message: `Booking is already ${booking.status} and cannot be modified`,
    };
  }

  // --- Cancellation ---
  if (payload.status === "cancelled") {
    if (
      booking.slotType === "schedule" &&
      booking.scheduleDetails?.vendorSlotId
    ) {
      await releaseVendorSlot(booking.scheduleDetails.vendorSlotId);
    }
    booking.status = "cancelled";
    booking.cancellation = {
      cancelledBy: payload.cancellation?.cancelledBy || "user",
      reason: payload.cancellation?.reason || null,
      cancelledAt: new Date(),
      refundAmount: payload.cancellation?.refundAmount ?? null,
    };
    return booking.save();
  }

  // --- Reschedule (schedule bookings only) --- flat "slotId", not nested scheduleDetails
  if (payload.slotId && booking.slotType === "schedule") {
    const newSlotId = payload.slotId;
    const currentSlotId = booking.scheduleDetails?.vendorSlotId;

    if (!isValidObjectId(newSlotId))
      throw { statusCode: 400, message: "Invalid slotId" };

    if (String(newSlotId) !== String(currentSlotId)) {
      const claimedSlot = await claimVendorSlot(newSlotId);

      const validCategory = await isSlotCategoryValidForTarget(
        claimedSlot.category_id,
        booking.category_id,
        booking.sub_category_id,
      );
      if (!validCategory) {
        await releaseVendorSlot(claimedSlot._id);
        throw {
          statusCode: 400,
          message: "New slot does not belong to this booking's category",
        };
      }

      try {
        await releaseVendorSlot(currentSlotId);
        booking.vendor_id = claimedSlot.vendor_id;
        booking.scheduleDetails = {
          date: claimedSlot.date,
          day: DAY_NAMES[new Date(claimedSlot.date).getUTCDay()],
          startTime: claimedSlot.startTime,
          endTime: claimedSlot.endTime,
          vendorSlotId: claimedSlot._id,
        };
        booking.rescheduledFrom = booking.rescheduledFrom || booking._id;
        await VendorSlot.findByIdAndUpdate(claimedSlot._id, {
          $set: { booking_id: booking._id },
        });
      } catch (err) {
        await releaseVendorSlot(claimedSlot._id);
        throw err;
      }
    }
  }

  // --- General field updates ---
  const allowedFields = [
    "status",
    "paymentStatus",
    "payment_id",
    "otp",
    "vendor_id",
    "instantDetails",
  ];
  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) booking[field] = payload[field];
  });

  await booking.save();
  return booking;
};

// === DELETE ===

export const deleteSlotBooking = async (id, force = false) => {
  if (!isValidObjectId(id))
    throw { statusCode: 400, message: "Invalid booking id" };

  const booking = await SlotBooking.findById(id);
  if (!booking) throw { statusCode: 404, message: "Booking not found" };

  const protectedStatuses = [
    "confirmed",
    "vendor_on_way",
    "in_progress",
    "completed",
  ];
  if (
    (protectedStatuses.includes(booking.status) ||
      booking.paymentStatus === "paid") &&
    !force
  ) {
    throw {
      statusCode: 400,
      message:
        "This booking is active or paid. Cancel it first, or pass force=true",
    };
  }

  if (
    booking.slotType === "schedule" &&
    booking.scheduleDetails?.vendorSlotId
  ) {
    await releaseVendorSlot(booking.scheduleDetails.vendorSlotId);
  }

  await SlotBooking.deleteOne({ _id: id });
  return booking;
};
