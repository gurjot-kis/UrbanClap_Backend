import mongoose from "mongoose";
import VendorSlot from "../models/vendor-slot.model.js";
import VendorService from "../models/vendor-service.model.js";
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

const belongsToCategory = async (service_id, category_id) => {
  let current = await Category.findById(service_id).lean();
  while (current) {
    // direct parent matches
    if (current.parent_id?.toString() === category_id.toString()) return true;
    // no more parents to check
    if (!current.parent_id) break;
    current = await Category.findById(current.parent_id).lean();
  }
  return false;
};

export const VendorSlotService = {
  createVendorSlot: async (payload) => {
    const { vendor_id, category_id, date, startTime, endTime, location } =
      payload;

    // ── Validate IDs ──────────────────────────────────────────────────────────
    if (!isValidObjectId(vendor_id))
      throw { statusCode: 400, message: "Invalid vendor_id" };
    if (!isValidObjectId(category_id))
      throw { statusCode: 400, message: "Invalid category_id" };

    // ── Validate required fields ───────────────────────────────────────────────
    if (!date || !startTime || !endTime)
      throw {
        statusCode: 400,
        message: "date, startTime and endTime are required",
      };

    if (timeToMinutes(endTime) <= timeToMinutes(startTime))
      throw { statusCode: 400, message: "endTime must be after startTime" };

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

    // ── Verify vendor + category exist in parallel ─────────────────────────────
    const [vendor, category] = await Promise.all([
      User.findOne({ _id: vendor_id, role: "Vendor" }),
      Category.findById(category_id).lean(),
    ]);

    if (!vendor) throw { statusCode: 404, message: "Vendor not found" };
    if (!category) throw { statusCode: 404, message: "Category not found" };

    const childCount = await Category.countDocuments({
      parent_id: category_id,
      status: "active",
    });

    if (childCount === 0) {
      throw {
        statusCode: 400,
        message:
          "category_id must be a parent category (e.g. Electrician), not a leaf service",
      };
    }

    // ✅ verify vendor has at least one active service whose root ancestor
    // matches the given category_id
    // VendorService.service_id → leaf Category → walk up tree → must reach category_id
    const vendorServices = await VendorService.find({
      vendor_id,
      status: "active",
    })
      .select("service_id")
      .lean();

    if (vendorServices.length === 0) {
      throw {
        statusCode: 400,
        message:
          "Vendor has no active services. Add services first before creating a slot.",
      };
    }

    // walk up each vendor service's category tree to find if any belongs to category_id
    const rootChecks = await Promise.all(
      vendorServices.map((vs) => belongsToCategory(vs.service_id, category_id)),
    );

    const hasServiceInCategory = rootChecks.some(Boolean);

    if (!hasServiceInCategory) {
      throw {
        statusCode: 400,
        message:
          "Vendor has no active services under this category. Add services first before creating a slot.",
      };
    }

    // ── Create slot ───────────────────────────────────────────────────────────
    try {
      return await VendorSlot.create({
        vendor_id,
        category_id,
        date: new Date(date),
        startTime,
        endTime,
        location: { type: "Point", coordinates: location.coordinates },
      });
    } catch (err) {
      if (err.code === 11000) {
        throw {
          statusCode: 409,
          message:
            "A slot already exists for this vendor, category, date and time",
        };
      }
      throw err;
    }
  },

  getAllVendorSlots: async (query) => {
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
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [slots, total] = await Promise.all([
      VendorSlot.find(filter)
        .populate("category_id", "name slotConfig")
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VendorSlot.countDocuments(filter),
    ]);

    const slotTypeByCategory = new Map();

    const getSlotTypeForCategory = (category) => {
      const catId = category?._id?.toString();
      if (!catId) return ["schedule"];
      if (!slotTypeByCategory.has(catId)) {
        const { allowInstant, allowSchedule } = category.slotConfig || {};
        slotTypeByCategory.set(
          catId,
          allowInstant && allowSchedule
            ? ["instant", "schedule"]
            : ["schedule"],
        );
      }
      return slotTypeByCategory.get(catId);
    };

    const slotsWithType = slots.map((slot) => ({
      _id: slot._id,
      slotType: getSlotTypeForCategory(slot.category_id),
      startTime: formatTimeToAMPM(slot.startTime),
      endTime: formatTimeToAMPM(slot.endTime),
    }));

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
  },

  getVendorSlots: async (vendor_id, query = {}) => {
    if (!isValidObjectId(vendor_id))
      throw { statusCode: 400, message: "Invalid vendor id" };

    const {
      category_id,
      date,
      from_date,
      to_date,
      status,
      page = 1,
      limit = 20,
    } = query;

    const filter = { vendor_id };

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

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [slots, total] = await Promise.all([
      VendorSlot.find(filter)
        .populate("category_id", "name slotConfig category_image")
        .sort({ date: 1, startTime: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      VendorSlot.countDocuments(filter),
    ]);

    const slotTypeByCategory = new Map();

    const getSlotTypeForCategory = (category) => {
      const categoryId = category?._id?.toString();
      if (!categoryId) return ["schedule"];
      if (!slotTypeByCategory.has(categoryId)) {
        const { allowInstant, allowSchedule } = category.slotConfig || {};
        slotTypeByCategory.set(
          categoryId,
          allowInstant && allowSchedule
            ? ["instant", "schedule"]
            : ["schedule"],
        );
      }
      return slotTypeByCategory.get(categoryId);
    };

    const data = slots.map((slot) => ({
      _id: slot._id,
      vendor_id: slot.vendor_id,
      category_id: slot.category_id?._id,
      categoryName: slot.category_id?.name || null,
      categoryImage: slot.category_id?.category_image || null,
      slotType: getSlotTypeForCategory(slot.category_id),
      date: slot.date,
      startTime: formatTimeToAMPM(slot.startTime),
      endTime: formatTimeToAMPM(slot.endTime),
      location: slot.location,
      status: slot.status,
    }));

    const totalPages = Math.ceil(total / limitNum);

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  },

  getVendorSlotById: async (id, vendor_id) => {
    if (!isValidObjectId(id)) {
      throw { statusCode: 400, message: "Invalid slot id" };
    }

    const query = { _id: id };
    if (vendor_id) query.vendor_id = vendor_id;

    const slot = await VendorSlot.findOne(query)
      .populate("category_id", "name slotConfig")
      .lean();

    if (!slot) {
      throw { statusCode: 404, message: "Vendor slot not found" };
    }

    const { allowInstant, allowSchedule } = slot.category_id?.slotConfig || {};
    const slotType =
      allowInstant && allowSchedule ? ["instant", "schedule"] : ["schedule"];

    return {
      _id: slot._id,
      vendor_id: slot.vendor_id,
      category_id: slot.category_id?._id,
      categoryName: slot.category_id?.name || null,
      slotType,
      date: slot.date,
      startTime: formatTimeToAMPM(slot.startTime),
      endTime: formatTimeToAMPM(slot.endTime),
      location: slot.location,
      status: slot.status,
      bookedCount: slot.bookedCount,
      capacity: slot.capacity,
      createdAt: slot.createdAt,
      updatedAt: slot.updatedAt,
    };
  },

  updateVendorSlot: async (id, payload) => {
    if (!isValidObjectId(id))
      throw { statusCode: 400, message: "Invalid slot id" };

    const slot = await VendorSlot.findById(id);
    if (!slot) throw { statusCode: 404, message: "Slot not found" };

    if (slot.bookedCount > 0 && !payload.force) {
      throw {
        statusCode: 400,
        message:
          "Slot has active bookings. Cancel the booking before modifying it",
      };
    }

    // ✅ capacity removed from allowedFields — vendor shouldn't change it freely
    const allowedFields = [
      "date",
      "startTime",
      "endTime",
      "status",
      "location",
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

    if (timeToMinutes(slot.endTime) <= timeToMinutes(slot.startTime))
      throw { statusCode: 400, message: "endTime must be after startTime" };

    try {
      await slot.save();
    } catch (err) {
      if (err.code === 11000) {
        throw {
          statusCode: 409,
          message:
            "Another slot already exists for this vendor, category, date and time",
        };
      }
      throw err;
    }

    return slot;
  },

  deleteVendorSlot: async (id, force = false) => {
    if (!isValidObjectId(id))
      throw { statusCode: 400, message: "Invalid slot id" };

    const slot = await VendorSlot.findById(id);
    if (!slot) throw { statusCode: 404, message: "Slot not found" };

    if (slot.bookedCount > 0 && !force) {
      throw {
        statusCode: 400,
        message:
          "Cannot delete a slot with active bookings. Cancel bookings first or pass force=true",
      };
    }

    await VendorSlot.deleteOne({ _id: id });
    return slot;
  },

  updateVendorSlotAailability: async (id) => {
    if (!isValidObjectId(id))
      throw { statusCode: 400, message: "Invalid slot id" };

    const slot = await VendorSlot.findById(id);
    if (!slot) throw { statusCode: 404, message: "Slot not found" };

    if (slot.bookedCount > 0) {
      throw {
        statusCode: 400,
        message: "Slot with active bookings cannot be blocked",
      };
    }

    slot.status = slot.status === "available" ? "blocked" : "available";
    await slot.save();
    return slot;
  },
};

export default VendorSlotService;
