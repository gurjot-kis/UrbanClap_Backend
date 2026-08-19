import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Category from "../models/category.model.js";
import { mapUserStatus, parseUserStatus } from "../utils/user-status.js";

const normalizeName = (value) => String(value).trim();
const normalizeEmail = (value) => String(value).trim().toLowerCase();

const parseLatitude = (value) => {
  const n =
    typeof value === "number" ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n) || n < -90 || n > 90) {
    throw new Error("latitude must be a number between -90 and 90");
  }
  return n;
};

const parseLongitude = (value) => {
  const n =
    typeof value === "number" ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n) || n < -180 || n > 180) {
    throw new Error("longitude must be a number between -180 and 180");
  }
  return n;
};

const normalizeCoordinates = (currentLocation) => {
  if (currentLocation === undefined) return undefined;
  const { lat, lng } = currentLocation || {};
  if (lat === undefined || lng === undefined) {
    throw new Error("currentLocation requires lat and lng");
  }
  return {
    type: "Point",
    coordinates: [parseLongitude(lng), parseLatitude(lat)],
  };
};

const normalizeServiceableAreas = (serviceableAreas) => {
  if (serviceableAreas === undefined) return undefined;
  if (!Array.isArray(serviceableAreas)) {
    throw new Error("serviceableAreas must be an array");
  }
  return serviceableAreas.map((item) => ({
    pincode: String(item.pincode || "").trim(),
  }));
};

const normalizeVendorCategories = (vendorCategories) => {
  if (vendorCategories === undefined) return undefined;
  if (!Array.isArray(vendorCategories)) {
    throw new Error("vendorCategories must be an array of category ids");
  }
  return vendorCategories;
};

const buildVendorResponse = (v) => ({
  user_id: v.user_id,
  fullName: v.name,
  email: v.email,
  phone: v.phone || "",
  address: v.address || "",
  code: v.code || "",
  gst_number: v.gst_number || "",
  status: mapUserStatus(v.status),
  vendorCategories: v.vendorCategories || [],
  serviceableAreas: v.serviceableAreas || [],
  currentLocation: v.currentLocation || null,
  isAvailableNow: !!v.isAvailableNow,
  isVendorVerified: !!v.isVendorVerified,
  createdAt: v.createdAt,
});

const buildVendorListResponse = (v) => ({
  ...buildVendorResponse(v),

  category: (v.category || []).map((category) => ({
    _id: category._id,
    name: category.name,
    image: category.category_image || "",
  })),
});

export const VendorService = {
  getVendors: async ({
    page = 1,
    limit = 10,
    search = "",
    status,
    category,
    isVendorVerified,
    isAvailableNow,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { role: "Vendor" };

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { code: regex },
        { gst_number: regex },
      ];
    }

    if (
      status !== undefined &&
      status !== null &&
      String(status).trim() !== ""
    ) {
      filter.status = parseUserStatus(status);
    }

    if (category) {
      filter.vendorCategories = category;
    }

    if (
      isVendorVerified !== undefined &&
      String(isVendorVerified).trim() !== ""
    ) {
      filter.isVendorVerified = String(isVendorVerified) === "true";
    }

    if (isAvailableNow !== undefined && String(isAvailableNow).trim() !== "") {
      filter.isAvailableNow = String(isAvailableNow) === "true";
    }

    const allowedSortFields = ["createdAt", "name", "email", "status"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = sortOrder === "asc" ? 1 : -1;

    const [vendors, total] = await Promise.all([
      User.aggregate([
        {
          $match: filter,
        },

        {
          $sort: {
            [sortField]: sortDir,
          },
        },

        {
          $skip: skip,
        },

        {
          $limit: parsedLimit,
        },

        {
          $lookup: {
            from: "categories",
            localField: "vendorCategories",
            foreignField: "_id",
            as: "category",
          },
        },

        {
          $project: {
            passwordHash: 0,
            resetOtp: 0,
            resetOtpExpiry: 0,
            resetToken: 0,
            resetTokenExpiry: 0,
            loginTwilioOtp: 0,
            loginTwilioOtpExpiry: 0,
          },
        },
      ]),

      User.countDocuments(filter),
    ]);

    return {
      vendors: vendors.map(buildVendorListResponse),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1,
      },
    };
  },

  getVendorById: async ({ user_id }) => {
    if (!user_id) throw new Error("user_id is required");

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    })
      .select(
        "-passwordHash -resetOtp -resetOtpExpiry -resetToken -resetTokenExpiry -loginTwilioOtp -loginTwilioOtpExpiry",
      )
      .lean()
      .exec();

    if (!vendor) throw new Error("Vendor not found");
    return buildVendorResponse(vendor);
  },

  addVendor: async ({
    fullName,
    email,
    password,
    phone,
    address,
    code,
    gst_number,
    vendorCategories,
    serviceableAreas,
    status,
  }) => {
    if (!fullName || !email || !password) {
      throw new Error("fullName, email, and password are required");
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail }).exec();
    if (existing) throw new Error("User already exists with this email");

    const passwordHash = await bcrypt.hash(String(password), 10);

    const vendor = await User.create({
      name: normalizeName(fullName),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : "",
      address: address ? String(address).trim() : "",
      code: code ? String(code).trim() : "",
      gst_number: gst_number ? String(gst_number).trim() : "",
      role: "Vendor",
      status: parseUserStatus(status),
      passwordHash,
      vendorCategories: normalizeVendorCategories(vendorCategories) || [],
      serviceableAreas: normalizeServiceableAreas(serviceableAreas) || [],
    });

    return buildVendorResponse(vendor);
  },

  updateVendor: async ({
    user_id,
    fullName,
    email,
    password,
    phone,
    address,
    code,
    gst_number,
    status,
    vendorCategories,
    serviceableAreas,
    currentLocation,
  }) => {
    if (!user_id) throw new Error("user_id is required");
    if (!fullName || !email) throw new Error("fullName and email are required");

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    }).exec();
    if (!vendor) throw new Error("Vendor not found");

    const normalizedEmail = normalizeEmail(email);
    const duplicate = await User.findOne({
      email: normalizedEmail,
      user_id: { $ne: String(user_id).trim() },
    }).exec();
    if (duplicate) throw new Error("Email already in use");

    vendor.name = normalizeName(fullName);
    vendor.email = normalizedEmail;
    if (password) vendor.passwordHash = await bcrypt.hash(String(password), 10);
    if (phone !== undefined) vendor.phone = String(phone).trim();
    if (address !== undefined) vendor.address = String(address).trim();
    if (code !== undefined) vendor.code = String(code).trim();
    if (gst_number !== undefined) vendor.gst_number = String(gst_number).trim();
    if (status !== undefined) vendor.status = parseUserStatus(status);

    if (vendorCategories !== undefined) {
      vendor.vendorCategories = normalizeVendorCategories(vendorCategories);
    }
    if (serviceableAreas !== undefined) {
      vendor.serviceableAreas = normalizeServiceableAreas(serviceableAreas);
    }
    if (currentLocation !== undefined) {
      vendor.currentLocation = normalizeCoordinates(currentLocation);
    }

    await vendor.save();
    return buildVendorResponse(vendor);
  },

  updateVendorStatus: async ({ user_id, status }) => {
    if (!user_id) throw new Error("user_id is required");
    if (status === undefined || status === null || status === "") {
      throw new Error("status is required");
    }
    const parsedStatus = parseUserStatus(status);

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    }).exec();
    if (!vendor) throw new Error("Vendor not found");

    vendor.status = parsedStatus;
    await vendor.save();
    return buildVendorResponse(vendor);
  },

  updateVendorVerification: async ({ user_id, isVendorVerified }) => {
    if (!user_id) throw new Error("user_id is required");
    if (isVendorVerified === undefined)
      throw new Error("isVendorVerified is required");

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    }).exec();
    if (!vendor) throw new Error("Vendor not found");

    vendor.isVendorVerified = Boolean(isVendorVerified);
    await vendor.save();
    return buildVendorResponse(vendor);
  },

  updateVendorAvailability: async ({ user_id, isAvailableNow }) => {
    if (!user_id) throw new Error("user_id is required");
    if (isAvailableNow === undefined)
      throw new Error("isAvailableNow is required");

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    }).exec();
    if (!vendor) throw new Error("Vendor not found");

    vendor.isAvailableNow = Boolean(isAvailableNow);
    await vendor.save();
    return buildVendorResponse(vendor);
  },

  updateVendorLocation: async ({ user_id, latitude, longitude }) => {
    if (!user_id) throw new Error("user_id is required");
    const lat = parseLatitude(latitude);
    const lng = parseLongitude(longitude);

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    }).exec();
    if (!vendor) throw new Error("Vendor not found");

    vendor.currentLocation = { type: "Point", coordinates: [lng, lat] };
    await vendor.save();
    return buildVendorResponse(vendor);
  },

  deleteVendor: async ({ user_id }) => {
    if (!user_id) throw new Error("user_id is required");

    const vendor = await User.findOne({
      user_id: String(user_id).trim(),
      role: "Vendor",
    }).exec();
    if (!vendor) throw new Error("Vendor not found");

    await User.deleteOne({ user_id: String(user_id).trim() });
    return { user_id: String(user_id).trim() };
  },
};

export default VendorService;
