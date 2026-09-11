import mongoose from "mongoose";
import CategoryModel from "../models/category.model.js";
import VendorServiceModel from "../models/vendor-service.model.js";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const isLeafCategory = async (category_id) => {
  const childCount = await CategoryModel.countDocuments({
    parent_id: category_id,
    status: "active",
  });
  return childCount === 0;
};

export const getMyServices = async (vendor_id, query = {}) => {
  if (!isValidObjectId(vendor_id)) {
    throw { statusCode: 400, message: "Invalid vendor id" };
  }

  const { status, search, page = 1, limit = 20 } = query;

  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (pageNum - 1) * limitNum;

  const filter = { vendor_id };

  if (status) {
    if (!["active", "inactive"].includes(status)) {
      throw {
        statusCode: 400,
        message: "Invalid status. Use active or inactive",
      };
    }

    filter.status = status;
  }

  // Search service/category by name
  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    const categories = await CategoryModel.find({
      name: searchRegex,
      status: "active",
    })
      .select("_id")
      .lean();

    const categoryIds = categories.map((category) => category._id);

    filter.service_id = { $in: categoryIds };
  }

  const [vendorServices, total] = await Promise.all([
    VendorServiceModel.find(filter)
      .populate({
        path: "service_id",
        select: "name category_image parent_id",
        populate: {
          path: "parent_id",
          select: "name category_image",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),

    VendorServiceModel.countDocuments(filter),
  ]);

  const data = vendorServices.map((vs) => ({
    _id: vs._id,
    category: vs.service_id?.parent_id
      ? {
          _id: vs.service_id.parent_id._id,
          name: vs.service_id.parent_id.name,
          category_image: vs.service_id.parent_id.category_image || null,
        }
      : null,
    service: vs.service_id
      ? {
          _id: vs.service_id._id,
          name: vs.service_id.name,
          category_image: vs.service_id.category_image || null,
        }
      : null,

    status: vs.status,
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
};

export const addVendorServices = async (vendor_id, service_ids) => {
  if (!Array.isArray(service_ids) || service_ids.length === 0)
    throw { statusCode: 400, message: "service_ids array is required" };

  const invalidId = service_ids.find((id) => !isValidObjectId(id));
  if (invalidId)
    throw { statusCode: 400, message: `Invalid service_id: ${invalidId}` };

  // verify all exist, are active, and are leaf categories
  const services = await CategoryModel.find({
    _id: { $in: service_ids },
    status: "active",
  }).lean();

  if (services.length !== service_ids.length) {
    const foundIds = services.map((s) => s._id.toString());
    const missing = service_ids.filter((id) => !foundIds.includes(id));
    throw {
      statusCode: 404,
      message: `Categories not found or inactive: ${missing.join(", ")}`,
    };
  }

  // verify every selected service is a leaf category
  const leafChecks = await Promise.all(
    services.map(async (s) => ({
      id: s._id.toString(),
      name: s.name,
      isLeaf: await isLeafCategory(s._id),
    })),
  );

  const nonLeaf = leafChecks.filter((s) => !s.isLeaf);
  if (nonLeaf.length > 0) {
    throw {
      statusCode: 400,
      message: `These are not bookable services (not leaf level): ${nonLeaf.map((s) => s.name).join(", ")}`,
    };
  }

  // insertMany with ordered:false — skips duplicates, inserts new ones
  const docs = service_ids.map((service_id) => ({ vendor_id, service_id }));

  try {
    const result = await VendorServiceModel.insertMany(docs, {
      ordered: false,
      rawResult: true,
    });
    return {
      inserted: result.insertedCount,
      message: `${result.insertedCount} service(s) added successfully`,
    };
  } catch (err) {
    if (err.code === 11000) {
      throw {
        statusCode: 409,
        message: "All selected services already exist for this vendor",
      };
    }
    throw err;
  }
};

export const toggleVendorService = async (vendor_id, service_id) => {
  if (!isValidObjectId(service_id))
    throw { statusCode: 400, message: "Invalid service_id" };

  const vs = await VendorServiceModel.findOne({ vendor_id, _id: service_id });
  if (!vs) throw { statusCode: 404, message: "Service not found in your list" };

  vs.status = vs.status === "active" ? "inactive" : "active";
  await vs.save();
  return vs;
};

export const removeVendorService = async (vendor_id, service_id) => {
  if (!isValidObjectId(service_id))
    throw { statusCode: 400, message: "Invalid service_id" };

  const vs = await VendorServiceModel.findOne({ vendor_id, _id: service_id });
  if (!vs) throw { statusCode: 404, message: "Service not found in your list" };

  await VendorServiceModel.deleteOne({ _id: service_id });
  return vs;
};

export const getAllMyServices = async (vendor_id, query = {}) => {
  if (!isValidObjectId(vendor_id)) {
    throw { statusCode: 400, message: "Invalid vendor id" };
  }

  const { status, search } = query;

  const filter = { vendor_id };

  if (status) {
    if (!["active", "inactive"].includes(status)) {
      throw {
        statusCode: 400,
        message: "Invalid status. Use active or inactive",
      };
    }

    filter.status = status;
  }

  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    const categories = await CategoryModel.find({
      name: searchRegex,
      status: "active",
    })
      .select("_id")
      .lean();

    const categoryIds = categories.map((category) => category._id);

    filter.service_id = { $in: categoryIds };
  }

  const vendorServices = await VendorServiceModel.find(filter)
    .populate({
      path: "service_id",
      select: "name category_image parent_id",
      populate: {
        path: "parent_id",
        select: "name category_image",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  return vendorServices.map((vs) => ({
    _id: vs._id,

    category: vs.service_id?.parent_id
      ? {
          _id: vs.service_id.parent_id._id,
          name: vs.service_id.parent_id.name,
          category_image: vs.service_id.parent_id.category_image || null,
        }
      : null,

    service: vs.service_id
      ? {
          _id: vs.service_id._id,
          name: vs.service_id.name,
          category_image: vs.service_id.category_image || null,
        }
      : null,

    status: vs.status,
  }));
};
