import NativeCategory from "../models/nativeCategory.model.js";

export const NativeCategoryService = {
  getNativeCategoriesForMobile: async () => {
    return await NativeCategory.find({
      status: "active",
      level: 1,
    })
      .sort({ sort_order: 1, createdAt: -1 })
      .select("name slug category_image _id")
      .lean();
  },
};

export default NativeCategoryService;
