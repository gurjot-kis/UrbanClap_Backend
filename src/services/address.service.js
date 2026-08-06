import mongoose from "mongoose";
import Address from "../models/address.model.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const REQUIRED_FIELDS_MSG =
  "contactName, contactPhone, addressLine1, city, state, country and pincode are required";

const assertRequiredFields = ({
  contactName,
  contactPhone,
  addressLine1,
  city,
  state,
  country,
  pincode,
}) => {
  if (
    !contactName ||
    !contactPhone ||
    !addressLine1 ||
    !city ||
    !state ||
    !country ||
    !pincode
  ) {
    throw new AppError(REQUIRED_FIELDS_MSG, 400);
  }
};

/** Builds the GeoJSON location field from optional latitude/longitude inputs. */
const buildLocation = (latitude, longitude) => {
  if (latitude === undefined && longitude === undefined) return undefined;

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new AppError("latitude must be a number between -90 and 90", 400);
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new AppError("longitude must be a number between -180 and 180", 400);
  }

  return { type: "Point", coordinates: [lng, lat] };
};

/** Unsets isDefault on every other active address belonging to the user. */
const unsetOtherDefaults = async (userId, exceptAddressId = null) => {
  const filter = { user: userId, isActive: true, isDefault: true };
  if (exceptAddressId) filter._id = { $ne: exceptAddressId };
  await Address.updateMany(filter, { $set: { isDefault: false } }).exec();
};

const findOwnedActiveAddressOrThrow = async (userId, addressId) => {
  if (!isValidObjectId(addressId)) {
    throw new AppError("Invalid address id", 400);
  }

  const address = await Address.findOne({
    _id: addressId,
    user: userId,
    isActive: true,
  }).exec();

  if (!address) {
    throw new AppError("Address not found", 404);
  }

  return address;
};

export const AddressService = {
  addAddress: async (userId, payload) => {
    if (!userId) throw new AppError("User is required", 400);

    const {
      label,
      customLabel,
      contactName,
      contactPhone,
      houseNo,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      country,
      pincode,
      addressType,
      instructions,
      isDefault,
      latitude,
      longitude,
    } = payload;

    assertRequiredFields({
      contactName,
      contactPhone,
      addressLine1,
      city,
      state,
      country,
      pincode,
    });

    const existingCount = await Address.countDocuments({
      user: userId,
      isActive: true,
    }).exec();
    const shouldBeDefault = existingCount === 0 ? true : Boolean(isDefault);

    if (shouldBeDefault) {
      await unsetOtherDefaults(userId);
    }

    const location = buildLocation(latitude, longitude);

    const address = await Address.create({
      user: userId,
      label,
      customLabel,
      contactName,
      contactPhone,
      houseNo,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      country,
      pincode,
      addressType,
      instructions,
      isDefault: shouldBeDefault,
      ...(location ? { location } : {}),
    });

    return address;
  },

  listAddresses: async (userId) => {
    if (!userId) throw new AppError("User is required", 400);

    return Address.find({ user: userId, isActive: true }).sort({
      isDefault: -1,
      createdAt: -1,
    });
  },

  getAddressById: async (userId, addressId) => {
    if (!userId) throw new AppError("User is required", 400);
    return findOwnedActiveAddressOrThrow(userId, addressId);
  },

  updateAddress: async (userId, addressId, payload) => {
    if (!userId) throw new AppError("User is required", 400);

    const address = await findOwnedActiveAddressOrThrow(userId, addressId);

    const {
      label,
      customLabel,
      contactName,
      contactPhone,
      houseNo,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      country,
      pincode,
      addressType,
      instructions,
      isDefault,
      latitude,
      longitude,
    } = payload;

    assertRequiredFields({
      contactName,
      contactPhone,
      addressLine1,
      city,
      state,
      country,
      pincode,
    });

    const wantsDefault =
      isDefault !== undefined ? Boolean(isDefault) : address.isDefault;

    if (wantsDefault === false && address.isDefault) {
      const otherActiveCount = await Address.countDocuments({
        user: userId,
        isActive: true,
        _id: { $ne: addressId },
      }).exec();
      if (otherActiveCount > 0) {
        throw new AppError(
          "At least one address must remain default. Set another address as default first.",
          400,
        );
      }
    }

    address.label = label ?? address.label;
    address.customLabel = customLabel ?? address.customLabel;
    address.contactName = contactName;
    address.contactPhone = contactPhone;
    address.houseNo = houseNo ?? address.houseNo;
    address.addressLine1 = addressLine1;
    address.addressLine2 = addressLine2 ?? address.addressLine2;
    address.landmark = landmark ?? address.landmark;
    address.city = city;
    address.state = state;
    address.country = country;
    address.pincode = pincode;
    address.addressType = addressType ?? address.addressType;
    address.instructions = instructions ?? address.instructions;
    address.isDefault = wantsDefault;

    const location = buildLocation(latitude, longitude);
    if (location) address.location = location;

    await address.save();

    if (address.isDefault) {
      await unsetOtherDefaults(userId, address._id);
    }

    return address;
  },

  deleteAddress: async (userId, addressId) => {
    if (!userId) throw new AppError("User is required", 400);

    const address = await findOwnedActiveAddressOrThrow(userId, addressId);

    const wasDefault = address.isDefault;

    address.isActive = false;
    address.isDefault = false;
    await address.save();

    if (wasDefault) {
      const nextDefault = await Address.findOne({
        user: userId,
        isActive: true,
      }).sort({
        createdAt: -1,
      });
      if (nextDefault) {
        nextDefault.isDefault = true;
        await nextDefault.save();
      }
    }

    return { _id: addressId };
  },

  setDefaultAddress: async (userId, addressId) => {
    if (!userId) throw new AppError("User is required", 400);

    const target = await findOwnedActiveAddressOrThrow(userId, addressId);

    await unsetOtherDefaults(userId, target._id);
    target.isDefault = true;
    await target.save();

    return target;
  },
};

export default AddressService;
