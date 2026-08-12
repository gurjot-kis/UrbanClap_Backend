import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Cart from "../models/cart.model.js";
import Address from "../models/address.model.js";
import Order from "../models/order.model.js";
import { mapUserStatus, parseUserStatus } from "../utils/user-status.js";

const normalizeName = (value) => String(value).trim();
const normalizeEmail = (value) => String(value).trim().toLowerCase();
const normalizeUserId = (value) =>
  String(value ?? "")
    .trim()
    .replace(/^:/, "");

const buildUserResponse = (user) => ({
  user_id: user.user_id,
  fullName: user.name,
  email: user.email,
  phone: user.phone || "",
  dob: user.dob || null,
  anniversaryDate: user.anniversaryDate || null,
  address: user.address || "",
  latitude:
    user.latitude != null && Number.isFinite(user.latitude)
      ? user.latitude
      : null,
  longitude:
    user.longitude != null && Number.isFinite(user.longitude)
      ? user.longitude
      : null,
  status: mapUserStatus(user.status),
  role: user.role,
  vendorCategories: user.vendorCategories || [],
  serviceableAreas: user.serviceableAreas || [],
  currentLocation: user.currentLocation || null,
  isAvailableNow: !!user.isAvailableNow,
  isVendorVerified: !!user.isVendorVerified,
});

const parseLatitude = (value) => {
  if (value === undefined || value === null || value === "") {
    throw new Error("latitude is required");
  }
  const n =
    typeof value === "number" ? value : parseFloat(String(value).trim(), 10);
  if (!Number.isFinite(n) || n < -90 || n > 90) {
    throw new Error("latitude must be a number between -90 and 90");
  }
  return n;
};

const parseLongitude = (value) => {
  if (value === undefined || value === null || value === "") {
    throw new Error("longitude is required");
  }
  const n =
    typeof value === "number" ? value : parseFloat(String(value).trim(), 10);
  if (!Number.isFinite(n) || n < -180 || n > 180) {
    throw new Error("longitude must be a number between -180 and 180");
  }
  return n;
};

const normalizeCoordinates = (currentLocation) => {
  if (currentLocation === undefined) return undefined;

  const { lat, lng } = currentLocation || {};
  const latNum = parseLatitude(lat);
  const lngNum = parseLongitude(lng);

  return {
    type: "Point",
    coordinates: [lngNum, latNum],
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

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = String(value).trim();

  // DD-MM-YYYY
  const dateRegex = /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/;

  if (!dateRegex.test(date)) {
    throw new Error(`${fieldName} must be in DD-MM-YYYY format`);
  }

  return date;
};

export const UserService = {
  getUsers: async ({ page = 1, limit = 10, search = "", status } = {}) => {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { role: "User" };

    if (search && String(search).trim()) {
      const regex = new RegExp(String(search).trim(), "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (
      status !== undefined &&
      status !== null &&
      String(status).trim() !== ""
    ) {
      filter.status = parseUserStatus(status);
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .select(
          "user_id name email phone address latitude longitude status -_id",
        )
        .lean()
        .exec(),
      User.countDocuments(filter),
    ]);

    const mapped = users.map((u) => ({
      user_id: u.user_id,
      fullName: u.name,
      email: u.email,
      phone: u.phone || "",
      address: u.address || "",
      latitude:
        u.latitude != null && Number.isFinite(u.latitude) ? u.latitude : null,
      longitude:
        u.longitude != null && Number.isFinite(u.longitude)
          ? u.longitude
          : null,
      status: mapUserStatus(u.status),
    }));

    return {
      users: mapped,
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

  getUserById: async ({ user_id }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    const user = await User.findOne({
      user_id: String(user_id).trim(),
      role: "User",
    })
      .select("user_id name email phone address latitude longitude status -_id")
      .lean()
      .exec();

    if (!user) {
      throw new Error("User not found");
    }

    return buildUserResponse(user);
  },

  addUser: async ({ fullName, email, password, phone, address, status }) => {
    if (!fullName || !email || !password) {
      throw new Error("fullName, email, and password are required");
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedName = normalizeName(fullName);

    const existing = await User.findOne({ email: normalizedEmail }).exec();
    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : "",
      address: address ? String(address).trim() : "",
      role: "User",
      status: parseUserStatus(status),
      passwordHash,
    });

    return buildUserResponse(user);
  },

  updateUser: async ({
    user_id,
    fullName,
    email,
    password,
    phone,
    address,
    status,
    // vendor fields
    vendorCategories,
    serviceableAreas,
    currentLocation,
    isAvailableNow,
    isVendorVerified,
  }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!fullName || !email) {
      throw new Error("fullName and email are required");
    }

    const user = await User.findOne({
      user_id: String(user_id).trim(),
    }).exec();
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedEmail = normalizeEmail(email);

    const duplicate = await User.findOne({
      email: normalizedEmail,
      user_id: { $ne: String(user_id).trim() },
    }).exec();

    if (duplicate) {
      throw new Error("Email already in use");
    }

    user.name = normalizeName(fullName);
    user.email = normalizedEmail;
    if (password) {
      user.passwordHash = await bcrypt.hash(String(password), 10);
    }
    user.phone = phone ? String(phone).trim() : "";
    user.address = address ? String(address).trim() : "";
    if (status !== undefined) {
      user.status = parseUserStatus(status);
    }

    // vendor-only fields — only applied if key is present in payload
    if (vendorCategories !== undefined) {
      user.vendorCategories = normalizeVendorCategories(vendorCategories);
    }
    if (serviceableAreas !== undefined) {
      user.serviceableAreas = normalizeServiceableAreas(serviceableAreas);
    }
    if (currentLocation !== undefined) {
      user.currentLocation = normalizeCoordinates(currentLocation);
    }
    if (isAvailableNow !== undefined) {
      user.isAvailableNow = Boolean(isAvailableNow);
    }
    if (isVendorVerified !== undefined) {
      user.isVendorVerified = Boolean(isVendorVerified);
    }

    await user.save();

    return buildUserResponse(user);
  },

  updateUserStatus: async ({ user_id, status }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (status === undefined || status === null || status === "") {
      throw new Error("status is required");
    }

    const parsedStatus = parseUserStatus(status);

    const user = await User.findOne({
      user_id: String(user_id).trim(),
      role: "User",
    }).exec();

    if (!user) {
      throw new Error("User not found");
    }

    user.status = parsedStatus;

    await user.save();

    return buildUserResponse(user);
  },

  updateUserLocation: async ({ user_id, latitude, longitude }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    const lat = parseLatitude(latitude);
    const lng = parseLongitude(longitude);

    const user = await User.findOne({
      user_id: String(user_id).trim(),
      role: "User",
    }).exec();
    if (!user) {
      throw new Error("User not found");
    }

    user.latitude = lat;
    user.longitude = lng;
    await user.save();

    return buildUserResponse(user);
  },

  deleteUser: async ({ user_id }) => {
    const id = normalizeUserId(user_id);
    if (!id) {
      throw new Error("user_id is required");
    }

    const user = await User.findOne({ user_id: id, role: "User" }).exec();
    if (!user) {
      throw new Error("User not found");
    }

    await Promise.all([
      User.deleteOne({ user_id: id }),
      Cart.deleteMany({ user_id: id }),
      Address.deleteMany({ user_id: id }),
      Order.deleteMany({ user_id: id }),
    ]);

    return { user_id: id };
  },

  updateUserProfile: async ({
    user_id,
    name,
    email,
    phone,
    dob,
    anniversaryDate,
  }) => {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    if (!name || !email) {
      throw new Error("name and email are required");
    }

    const user = await User.findById(user_id).exec();

    if (!user) {
      throw new Error("User not found");
    }

    const normalizedEmail = normalizeEmail(email);

    const duplicate = await User.findOne({
      email: normalizedEmail,
      user_id: { $ne: String(user_id).trim() },
    }).exec();

    if (duplicate) {
      throw new Error("Email already in use");
    }

    user.name = normalizeName(name);
    user.email = normalizedEmail;

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    if (dob !== undefined) {
      user.dob = parseOptionalDate(dob, "dob");
    }

    if (anniversaryDate !== undefined) {
      user.anniversaryDate = parseOptionalDate(
        anniversaryDate,
        "anniversaryDate",
      );
    }

    await user.save();

    return buildUserResponse(user);
  },
};

export default UserService;
