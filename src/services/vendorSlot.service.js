import mongoose from "mongoose";
import VendorSlot from "../models/vendor-slot.model.js";
import Category from "../models/category.model.js";
import User from "../models/user.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatTimeToAMPM = (time) => {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
};

export const createVendorSlot = async (payload) => {
  const { vendor_id, category_id, date, startTime, endTime, location, status } =
    payload;

  if (!isValidObjectId(vendor_id))
    throw { statusCode: 400, message: "Invalid vendor_id" };
  if (!isValidObjectId(category_id))
    throw { statusCode: 400, message: "Invalid category_id" };
  if (!date || !startTime || !endTime) {
    throw {
      statusCode: 400,
      message: "date, startTime and endTime are required",
    };
  }
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw { statusCode: 400, message: "endTime must be after startTime" };
  }
  if (
    !location ||
    !Array.isArray(location.coordinates) ||
    location.coordinates.length !== 2
  ) {
    throw {
      statusCode: 400,
      message: "location.coordinates [lng, lat] is required",
    };
  }

  const [vendor, category] = await Promise.all([
    User.findOne({ _id: vendor_id, role: "Vendor" }),
    Category.findById(category_id),
  ]);

  if (!vendor) throw { statusCode: 404, message: "Vendor not found" };
  if (!category) throw { statusCode: 404, message: "Category not found" };

  try {
    return await VendorSlot.create({
      vendor_id,
      category_id,
      date: new Date(date),
      startTime,
      endTime,
      location: { type: "Point", coordinates: location.coordinates },
      status: status || "available",
    });
  } catch (err) {
    if (err.code === 11000) {
      throw {
        statusCode: 409,
        message: "A slot already exists for this vendor at this date and time",
      };
    }
    throw err;
  }
};

export const getAllVendorSlots = async (query) => {
  const {
    vendor_id,
    category_id,
    date,
    from_date,
    to_date,
    status,
    lat,
    lng,
    radiusKm,
    page = 1,
    limit = 20,
  } = query;

  const filter = {};

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

  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    filter.date = { $gte: start, $lt: end };
  } else if (from_date || to_date) {
    filter.date = {};
    if (from_date) filter.date.$gte = new Date(from_date);
    if (to_date) filter.date.$lte = new Date(to_date);
  }

  if (lat && lng) {
    const radiusInRadians = (Number(radiusKm) || 10) / 6378.1;
    filter.location = {
      $geoWithin: {
        $centerSphere: [[Number(lng), Number(lat)], radiusInRadians],
      },
    };
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.max(Number(limit) || 20, 1);
  const skip = (pageNum - 1) * limitNum;

  const [slots, total] = await Promise.all([
    VendorSlot.find(filter)
      .populate("category_id", "slotConfig")
      .sort({ date: 1, startTime: 1 })
      .skip(skip)
      .limit(limitNum),
    VendorSlot.countDocuments(filter),
  ]);

  // compute slotType once per unique category instead of per slot
  const slotTypeByCategory = new Map();

  const getSlotTypeForCategory = (category) => {
    const catId = category?._id?.toString();
    if (!catId) return ["schedule"];

    if (!slotTypeByCategory.has(catId)) {
      const slotConfig = category.slotConfig || {};
      const allowInstant = !!slotConfig.allowInstant;
      const allowSchedule = !!slotConfig.allowSchedule;
      slotTypeByCategory.set(
        catId,
        allowInstant && allowSchedule ? ["instant", "schedule"] : ["schedule"],
      );
    }

    return slotTypeByCategory.get(catId);
  };

  // pre-compute slotType per slot (still cached per category, no repeated logic)
  const slotsWithType = slots.map((slot) => ({
    _id: slot._id,
    slotType: getSlotTypeForCategory(slot.category_id),
    startTime: formatTimeToAMPM(slot.startTime),
    endTime: formatTimeToAMPM(slot.endTime),
  }));

  // if every slot in this result set has the same slotType, hoist it out once
  const distinctSlotTypes = new Set(
    slotsWithType.map((s) => JSON.stringify(s.slotType)),
  );

  let data;
  if (distinctSlotTypes.size === 1) {
    data = {
      slotType: slotsWithType[0].slotType,
      slots: slotsWithType.map(({ _id, startTime, endTime }) => ({
        _id,
        startTime,
        endTime,
      })),
    };
  } else {
    // mixed categories in result set — keep slotType per slot since it varies
    data = { slots: slotsWithType };
  }

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export const getVendorSlots = async (vendor_id, query = {}) => {
  if (!isValidObjectId(vendor_id)) {
    throw {
      statusCode: 400,
      message: "Invalid vendor id",
    };
  }

  const {
    category_id,
    date,
    from_date,
    to_date,
    status,
    page = 1,
    limit = 20,
  } = query;

  const filter = {
    vendor_id,
  };

  if (category_id) {
    if (!isValidObjectId(category_id)) {
      throw {
        statusCode: 400,
        message: "Invalid category_id",
      };
    }

    filter.category_id = category_id;
  }

  if (status) {
    filter.status = status;
  }

  if (date) {
    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    filter.date = {
      $gte: start,
      $lt: end,
    };
  } else if (from_date || to_date) {
    filter.date = {};

    if (from_date) {
      filter.date.$gte = new Date(from_date);
    }

    if (to_date) {
      filter.date.$lte = new Date(to_date);
    }
  }

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (pageNum - 1) * limitNum;

  const [slots, total] = await Promise.all([
    VendorSlot.find(filter)
      .populate("category_id", "name slotConfig")
      .sort({
        date: 1,
        startTime: 1,
      })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    VendorSlot.countDocuments(filter),
  ]);

  const slotTypeByCategory = new Map();

  const getSlotTypeForCategory = (category) => {
    const categoryId = category?._id?.toString();

    if (!categoryId) {
      return ["schedule"];
    }

    if (!slotTypeByCategory.has(categoryId)) {
      const slotConfig = category.slotConfig || {};

      const allowInstant = !!slotConfig.allowInstant;
      const allowSchedule = !!slotConfig.allowSchedule;

      const slotType =
        allowInstant && allowSchedule ? ["instant", "schedule"] : ["schedule"];

      slotTypeByCategory.set(categoryId, slotType);
    }

    return slotTypeByCategory.get(categoryId);
  };

  const data = slots.map((slot) => ({
    _id: slot._id,
    vendor_id: slot.vendor_id,
    category_id: slot.category_id?._id,
    categoryName: slot.category_id?.name || null,
    slotType: getSlotTypeForCategory(slot.category_id),
    date: slot.date,
    startTime: formatTimeToAMPM(slot.startTime),
    endTime: formatTimeToAMPM(slot.endTime),
    location: slot.location,
    status: slot.status,
    booking_id: slot.booking_id || null,
  }));

  return {
    data,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export const updateVendorSlot = async (id, payload) => {
  if (!isValidObjectId(id))
    throw { statusCode: 400, message: "Invalid slot id" };

  const slot = await VendorSlot.findById(id);
  if (!slot) throw { statusCode: 404, message: "Slot not found" };

  if (
    slot.status === "booked" &&
    payload.status !== "booked" &&
    !payload.force
  ) {
    throw {
      statusCode: 400,
      message: "Slot is booked. Cancel the booking before modifying it",
    };
  }

  const allowedFields = [
    "date",
    "startTime",
    "endTime",
    "status",
    "location",
    "booking_id",
  ];
  allowedFields.forEach((field) => {
    if (payload[field] === undefined) return;
    if (field === "location") {
      slot.location = {
        type: "Point",
        coordinates: payload.location.coordinates,
      };
    } else if (field === "date") {
      slot.date = new Date(payload.date);
    } else {
      slot[field] = payload[field];
    }
  });

  if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime)) {
    throw { statusCode: 400, message: "endTime must be after startTime" };
  }

  try {
    await slot.save();
  } catch (err) {
    if (err.code === 11000) {
      throw {
        statusCode: 409,
        message:
          "Another slot already exists for this vendor at this date and time",
      };
    }
    throw err;
  }

  return slot;
};

export const deleteVendorSlot = async (id, force = false) => {
  if (!isValidObjectId(id))
    throw { statusCode: 400, message: "Invalid slot id" };

  const slot = await VendorSlot.findById(id);
  if (!slot) throw { statusCode: 404, message: "Slot not found" };

  if (slot.status === "booked" && !force) {
    throw {
      statusCode: 400,
      message:
        "Cannot delete a booked slot. Cancel the booking first or pass force=true",
    };
  }

  await VendorSlot.deleteOne({ _id: id });
  return slot;
};
