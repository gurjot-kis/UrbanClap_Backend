import mongoose from "mongoose";
import NativeCategory from "../models/nativeCategory.model.js";
import NativeProduct from "../models/nativeProduct.model.js";
import PageContent from "../models/static-contents.model.js";

export const NativeCategoryService = {
  getNativeCategoryList: async () => {
    return await NativeCategory.find({
      status: "active",
      level: 1,
    })
      .sort({ sort_order: 1, createdAt: -1 })
      .select("name slug category_image _id")
      .lean();
  },

  getNativeProuctsByCategoryId: async ({ category_id }) => {
    if (!category_id) {
      throw new Error("category_id is required");
    }

    const categoryId = new mongoose.Types.ObjectId(category_id);
    const [products, banner] = await Promise.all([
      NativeProduct.aggregate([
        {
          $match: {
            category_id: categoryId,
            status: "active",
          },
        },
        {
          $project: {
            _id: 1,
            product_name: 1,
            main_image: 1,
            base_price: 1,
            rating: 1,
            options_count: {
              $size: { $ifNull: ["$options", []] },
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ]),

      PageContent.findOne({
        page: "NativeCategoryDetails",
        key: "native_category_details",
        status: "active",
        nativeCategoryId: categoryId,
      })
        .select("backgroundImage marqueeContent nativeCategoryDetails")
        .lean(),
    ]);
    return {
      bannerImage: banner?.backgroundImage ?? null,
      marqueeContent: banner?.marqueeContent ?? [],
      category_details: banner?.nativeCategoryDetails ?? [],
      products,
    };
  },
};

export default NativeCategoryService;
