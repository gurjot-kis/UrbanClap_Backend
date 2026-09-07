import mongoose from "mongoose";
import SlotBooking from "../models/slot-booking.model.js";
import VendorSlot from "../models/vendor-slot.model.js";
import Product from "../models/product.model.js";
import Address from "../models/address.model.js";
import NativeProduct from "../models/nativeProduct.model.js";
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

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatTimeToAMPM = (time) => {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
};

const resolveLineItem = (product, productType, variantKey, quantity) => {
  // ── quantity check ───────────────────────────────────────────────────────
  const maxQty =
    productType === "native"
      ? 99 // NativeProduct has no maxQuantity field
      : (product.maxQuantity ?? 99);

  if (quantity > maxQty) {
    throw {
      statusCode: 400,
      message: `Quantity cannot exceed ${maxQty} for "${productType === "native" ? product.product_name : product.name}"`,
    };
  }

  // ── Service Product (has variants + durationMinutes) ─────────────────────
  if (productType === "service") {
    let variant = null;
    let unitPrice = product.basePrice;

    if (variantKey) {
      variant = product.variants?.find((v) => v.key === variantKey);
      if (!variant) {
        throw {
          statusCode: 400,
          message: `Invalid variant key "${variantKey}" for "${product.name}"`,
        };
      }
      unitPrice = variant.price;
    }

    return {
      product_id: product._id,
      productType: "service",
      variant: variant
        ? { key: variant.key, label: variant.label, price: variant.price }
        : { key: null, label: null, price: null },
      basePrice: unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      duration: (product.durationMinutes || 0) * quantity,
      category_id: product.category_id,
      sub_category_id: product.sub_category_id,
    };
  }

  // ── Native Product (has options not variants, no durationMinutes) ─────────
  if (productType === "native") {
    let option = null;
    let unitPrice = product.base_price;

    if (variantKey) {
      // NativeProduct uses "options" with "_id" as key
      option = product.options?.find((o) => String(o._id) === variantKey);
      if (!option) {
        throw {
          statusCode: 400,
          message: `Invalid option for "${product.product_name}"`,
        };
      }
      unitPrice = option.price;
    }

    return {
      product_id: product._id,
      productType: "native",
      variant: option
        ? { key: String(option._id), label: option.label, price: option.price }
        : { key: null, label: null, price: null },
      basePrice: unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      duration: 0, // native products have no duration
      category_id: product.category_id,
      sub_category_id: product.sub_category_id,
    };
  }
};

const resolveServiceAddress = async (
  userId,
  address_id,
  rawServiceAddress,
  rawLocation,
) => {
  if (address_id) {
    if (!isValidObjectId(address_id))
      throw { statusCode: 400, message: "Invalid address_id" };

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

  if (
    !rawServiceAddress?.contactName ||
    !rawServiceAddress?.contactPhone ||
    !rawServiceAddress?.addressLine1 ||
    !rawServiceAddress?.city ||
    !rawServiceAddress?.state ||
    !rawServiceAddress?.pincode
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
  // atomic findOneAndUpdate without pipeline syntax
  const slot = await VendorSlot.findOneAndUpdate(
    {
      _id: vendorSlotId,
      status: "available",
      $expr: { $lt: ["$bookedCount", "$capacity"] },
    },
    { $inc: { bookedCount: 1 } }, // ✅ plain update, no pipeline array
    { new: true },
  );

  if (!slot) {
    throw {
      statusCode: 409,
      message: "This slot is no longer available. Please pick another.",
    };
  }

  // ✅ now check if fully booked and block it
  if (slot.bookedCount >= slot.capacity) {
    await VendorSlot.findByIdAndUpdate(slot._id, {
      $set: { status: "blocked" },
    });
    slot.status = "blocked"; // reflect in returned object
  }

  return slot;
};

const releaseVendorSlot = async (vendorSlotId) => {
  if (!vendorSlotId) return;
  const slot = await VendorSlot.findById(vendorSlotId);
  if (!slot) return;

  const newCount = Math.max((slot.bookedCount || 1) - 1, 0);
  await VendorSlot.findByIdAndUpdate(vendorSlotId, {
    $set: {
      bookedCount: newCount,
      // ✅ restore to available when a booking is cancelled/released
      status: newCount < slot.capacity ? "available" : "blocked",
    },
  });
};

const getCategoryAncestryChain = async (categoryId) => {
  const chain = [];
  let currentId = categoryId;
  while (currentId) {
    chain.push(String(currentId));
    const cat = await Category.findById(currentId).select("parent_id").lean();
    if (!cat) break;
    currentId = cat.parent_id;
  }
  return chain;
};

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

export const SlotBookingService = {
  createSlotBooking: async (userId, payload) => {
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
    if (!Array.isArray(cartItems) || cartItems.length === 0)
      throw { statusCode: 400, message: "cartItems must be a non-empty array" };
    if (!["instant", "schedule"].includes(slotType))
      throw {
        statusCode: 400,
        message: "slotType must be 'instant' or 'schedule'",
      };

    for (const item of cartItems) {
      if (!isValidObjectId(item.product_id))
        throw { statusCode: 400, message: "Invalid product_id in cartItems" };
    }

    const productIds = cartItems.map((i) => i.product_id);

    // ✅ search both Product and NativeProduct in parallel
    const [serviceProducts, nativeProducts] = await Promise.all([
      Product.find({ _id: { $in: productIds }, status: "active" }).lean(),
      NativeProduct.find({ _id: { $in: productIds }, status: "active" }).lean(),
    ]);

    // merge into one map with type tag
    const productMap = new Map();
    for (const p of serviceProducts)
      productMap.set(String(p._id), { product: p, type: "service" });
    for (const p of nativeProducts)
      productMap.set(String(p._id), { product: p, type: "native" });

    const uniqueIds = [...new Set(productIds.map(String))];
    if (productMap.size !== uniqueIds.length) {
      throw {
        statusCode: 404,
        message: "One or more products not found or inactive",
      };
    }

    const resolvedItems = cartItems.map((item) => {
      const entry = productMap.get(String(item.product_id));
      if (!entry)
        throw {
          statusCode: 404,
          message: `Product ${item.product_id} not found`,
        };
      return resolveLineItem(
        entry.product,
        entry.type,
        item.variantKey,
        item.quantity || 1,
      );
    });

    const categoryIds = new Set(
      resolvedItems.map((i) => String(i.category_id)),
    );
    if (categoryIds.size > 1) {
      throw {
        statusCode: 400,
        message:
          "All items in a single booking must belong to the same category",
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
      user: userId,
      items: resolvedItems.map(
        ({
          product_id,
          productType,
          variant,
          basePrice,
          quantity,
          lineTotal,
          duration,
        }) => ({
          product_id,
          productType,
          variant,
          basePrice,
          quantity,
          lineTotal,
          duration, // ✅ store per-item duration
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
      if (!slotId || !isValidObjectId(slotId))
        throw {
          statusCode: 400,
          message: "slotId is required for a schedule booking",
        };

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
        await releaseVendorSlot(claimedSlot._id);
        throw err;
      }
    }

    bookingData.instantDetails = {
      requestedAt: new Date(),
      expectedArrivalTime: null,
      assignedAt: null,
    };
    bookingData.status = "pending";
    return SlotBooking.create(bookingData);
  },

  getAllSlotBookings: async (query) => {
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
  },

  updateSlotBooking: async (id, payload) => {
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
  },

  deleteSlotBooking: async (id, force = false) => {
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
  },

  getMobileSlots: async (userId, category_id) => {
    if (!isValidObjectId(userId))
      throw { statusCode: 401, message: "Unauthorized" };
    if (!category_id || !isValidObjectId(category_id))
      throw { statusCode: 400, message: "Valid category_id is required" };

    const [userAddress, allCategories] = await Promise.all([
      Address.findOne({ user: userId, isActive: true })
        .sort({ isDefault: -1 })
        .lean(),
      Category.find({ status: "active" }).select("_id parent_id").lean(),
    ]);

    if (!userAddress)
      throw { statusCode: 404, message: "No active address found for user" };

    const coords = userAddress.location?.coordinates;
    if (!coords || (coords[0] === 0 && coords[1] === 0)) {
      throw {
        statusCode: 400,
        message:
          "User address has no valid location. Please update your address.",
      };
    }

    const [lng, lat] = coords;
    const catIdStr = String(category_id);

    const parentMap = new Map(
      allCategories.map((c) => [
        String(c._id),
        c.parent_id ? String(c.parent_id) : null,
      ]),
    );
    const ancestorChain = [];
    let cur = catIdStr;
    while (cur) {
      ancestorChain.push(cur);
      cur = parentMap.get(cur) || null;
    }

    const childrenMap = new Map();
    for (const c of allCategories) {
      const pid = c.parent_id ? String(c.parent_id) : null;
      if (!pid) continue;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid).push(String(c._id));
    }

    const descendants = [];
    const stack = [catIdStr];
    while (stack.length) {
      const node = stack.pop();
      const children = childrenMap.get(node) || [];
      for (const child of children) {
        descendants.push(child);
        stack.push(child);
      }
    }

    const categorySet = [...new Set([...ancestorChain, ...descendants])];

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);

    const IST_OFFSET_MINUTES = 5 * 60 + 30;
    const nowIST = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
    const currentTimeStr = `${String(nowIST.getUTCHours()).padStart(2, "0")}:${String(nowIST.getUTCMinutes()).padStart(2, "0")}`;

    const slots = await VendorSlot.find({
      status: "available",
      category_id: { $in: categorySet },
      $or: [
        { date: { $gte: startOfTomorrow } },
        {
          date: { $gte: startOfToday, $lt: startOfTomorrow },
          startTime: { $gte: currentTimeStr },
        },
      ],
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: 10 * 1000,
        },
      },
    })
      .sort({ date: 1, startTime: 1 })
      .populate("vendor_id", "name profileImage")
      .populate("category_id", "name")
      .limit(20)
      .select("date startTime endTime category_id vendor_id")
      .lean();

    const todayUTCDay = startOfToday.getUTCDay();
    const getDayLabel = (date) => {
      const slotDay = new Date(date).getUTCDay();
      if (slotDay === todayUTCDay) return "Today";
      return SHORT_DAYS[slotDay];
    };

    return slots.map((slot) => ({
      _id: slot._id,
      category: slot.category_id,
      date: slot.date,
      day: getDayLabel(slot.date),
      startTime: formatTimeToAMPM(slot.startTime),
      endTime: formatTimeToAMPM(slot.endTime),
      vendor: {
        _id: slot.vendor_id?._id || null,
        name: slot.vendor_id?.name || null,
        image: slot.vendor_id?.profileImage || null,
        rating: null,
        totalJobs: null,
      },
    }));
  },
};

export default SlotBookingService;
