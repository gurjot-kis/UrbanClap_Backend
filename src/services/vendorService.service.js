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

export const getMyServices = async (vendor_id) => {
  const vendorServices = await VendorServiceModel.find({ vendor_id })
    .populate({
      path: "service_id",
      select: "name description durationMinutes parent_id level",
      populate: {
        path: "parent_id",
        select: "name",
      },
    })
    .lean();

  return vendorServices.map((vs) => ({
    _id: vs._id,
    service_id: vs.service_id?._id,
    name: vs.service_id?.name,
    description: vs.service_id?.description,
    durationMinutes: vs.service_id?.durationMinutes,
    subCategory: vs.service_id?.parent_id?.name || null,
    status: vs.status,
  }));
};

export const toggleVendorService = async (vendor_id, service_id) => {
  if (!isValidObjectId(service_id))
    throw { statusCode: 400, message: "Invalid service_id" };

  const vs = await VendorServiceModel.findOne({ vendor_id, service_id });
  if (!vs) throw { statusCode: 404, message: "Service not found in your list" };

  vs.status = vs.status === "active" ? "inactive" : "active";
  await vs.save();
  return vs;
};

export const removeVendorService = async (vendor_id, service_id) => {
  if (!isValidObjectId(service_id))
    throw { statusCode: 400, message: "Invalid service_id" };

  const vs = await VendorServiceModel.findOne({ vendor_id, service_id });
  if (!vs) throw { statusCode: 404, message: "Service not found in your list" };

  await VendorServiceModel.deleteOne({ _id: vs._id });
  return vs;
};
