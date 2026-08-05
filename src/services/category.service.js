import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Product from "../models/product.model.js";

export const CategoryService = {
  getCategoryTree: async () => {
    return await Category.aggregate([
      {
        $match: {
          level: 1,
          status: "active",
        },
      },
      {
        $lookup: {
          from: "categories",
          let: {
            parentId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$parent_id", "$$parentId"],
                },
                status: "active",
              },
            },
            {
              $lookup: {
                from: "categories",
                let: {
                  childId: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$parent_id", "$$childId"],
                      },
                      status: "active",
                    },
                  },
                  {
                    $project: {
                      name: 1,
                      level: 1,
                      description: 1,
                      category_image: 1,
                      status: 1,
                    },
                  },
                ],
                as: "children",
              },
            },
            {
              $project: {
                name: 1,
                level: 1,
                description: 1,
                category_image: 1,
                status: 1,
                children: 1,
              },
            },
          ],
          as: "children",
        },
      },
      {
        $project: {
          name: 1,
          level: 1,
          description: 1,
          category_image: 1,
          status: 1,
          children: 1,
        },
      },
    ]);
  },

  getCategoryById: async (id) => {
    const categoryId = new mongoose.Types.ObjectId(id);

    const result = await Category.aggregate([
      {
        $match: {
          _id: categoryId,
          status: "active",
        },
      },
      {
        $lookup: {
          from: "categories",
          let: {
            parentId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$parent_id", "$$parentId"],
                },
                status: "active",
              },
            },
            {
              $lookup: {
                from: "categories",
                let: {
                  childId: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$parent_id", "$$childId"],
                      },
                      status: "active",
                    },
                  },
                  {
                    $project: {
                      name: 1,
                      level: 1,
                      description: 1,
                      category_image: 1,
                      status: 1,
                    },
                  },
                ],
                as: "children",
              },
            },
            {
              $project: {
                name: 1,
                level: 1,
                description: 1,
                category_image: 1,
                status: 1,
                children: 1,
              },
            },
          ],
          as: "children",
        },
      },
      {
        $project: {
          name: 1,
          level: 1,
          description: 1,
          category_image: 1,
          status: 1,
          children: 1,
        },
      },
    ]);

    return result[0] || null;
  },

  createCategory: async ({ name, parent_id, description, category_image }) => {
    let level = 1;

    if (parent_id) {
      if (!mongoose.Types.ObjectId.isValid(parent_id)) {
        const err = new Error("Invalid parent category id");
        err.statusCode = 400;
        throw err;
      }

      const parent = await Category.findById(parent_id);

      if (!parent) {
        const err = new Error("Parent category not found");
        err.statusCode = 404;
        throw err;
      }

      if (parent.level >= 3) {
        const err = new Error("Maximum category depth (3 levels) exceeded");
        err.statusCode = 400;
        throw err;
      }

      level = parent.level + 1;
    }

    const existing = await Category.findOne({
      name: name.trim(),
      parent_id: parent_id || null,
    });

    if (existing) {
      const err = new Error(
        "A category with this name already exists under the same parent",
      );
      err.statusCode = 409;
      throw err;
    }

    const category = await Category.create({
      name,
      parent_id: parent_id || null,
      level,
      description,
      category_image,
    });

    return category;
  },

  updateCategory: async (
    id,
    { name, parent_id, description, category_image },
  ) => {
    const category = await Category.findById(id);

    if (!category) {
      const err = new Error("Category not found");
      err.statusCode = 404;
      throw err;
    }

    let level = category.level;
    let newParentId = category.parent_id;

    // Handle parent_id change (recalculate level, prevent cycles)
    if (parent_id !== undefined) {
      if (parent_id === "" || parent_id === null) {
        // Moving to top-level
        newParentId = null;
        level = 1;
      } else {
        if (!mongoose.Types.ObjectId.isValid(parent_id)) {
          const err = new Error("Invalid parent category id");
          err.statusCode = 400;
          throw err;
        }

        if (parent_id === id) {
          const err = new Error("A category cannot be its own parent");
          err.statusCode = 400;
          throw err;
        }

        const parent = await Category.findById(parent_id);

        if (!parent) {
          const err = new Error("Parent category not found");
          err.statusCode = 404;
          throw err;
        }

        if (parent.level >= 3) {
          const err = new Error("Maximum category depth (3 levels) exceeded");
          err.statusCode = 400;
          throw err;
        }

        // Prevent assigning a descendant as the new parent (would create a cycle)
        const descendants = await Category.find({ parent_id: id }).select(
          "_id",
        );
        const descendantIds = descendants.map((d) => d._id.toString());
        if (descendantIds.includes(parent_id)) {
          const err = new Error("Cannot assign a child category as the parent");
          err.statusCode = 400;
          throw err;
        }

        newParentId = parent._id;
        level = parent.level + 1;
      }
    }

    // Duplicate name check (excluding this category itself)
    if (name !== undefined) {
      const existing = await Category.findOne({
        _id: { $ne: id },
        name: name.trim(),
        parent_id: newParentId,
      });

      if (existing) {
        const err = new Error(
          "A category with this name already exists under the same parent",
        );
        err.statusCode = 409;
        throw err;
      }
    }

    const updateData = {
      parent_id: newParentId,
      level,
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category_image !== undefined)
      updateData.category_image = category_image;

    const updated = await Category.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return updated;
  },

  deleteCategory: async (id) => {
    const category = await Category.findById(id);

    if (!category) {
      const err = new Error("Category not found");
      err.statusCode = 404;
      throw err;
    }

    // Step 1: Recursively find the target + ALL descendants
    const result = await Category.aggregate([
      {
        $match: { _id: category._id },
      },
      {
        $graphLookup: {
          from: "categories",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parent_id",
          as: "descendants",
        },
      },
      {
        $project: {
          allIds: {
            $concatArrays: [["$_id"], "$descendants._id"],
          },
          categoryImages: {
            $concatArrays: [
              [{ $ifNull: ["$category_image", ""] }],
              {
                $map: {
                  input: "$descendants",
                  as: "d",
                  in: { $ifNull: ["$$d.category_image", ""] },
                },
              },
            ],
          },
        },
      },
    ]);

    const { allIds, categoryImages } = result[0];

    // Step 2: Find all products linked to any of the deleted category ids
    // A product is linked if category_id OR sub_category_id matches any deleted id
    const affectedProducts = await Product.find({
      $or: [
        { category_id: { $in: allIds } },
        { sub_category_id: { $in: allIds } },
      ],
    }).select("mainImage images variants");

    // Step 3: Collect all product image paths for file cleanup
    const productImages = [];
    affectedProducts.forEach((product) => {
      if (product.mainImage) productImages.push(product.mainImage);
      if (product.images?.length) productImages.push(...product.images);

      // Collect variant images too
      product.variants?.forEach((variant) => {
        if (variant.image) productImages.push(variant.image);
      });
    });

    const affectedProductIds = affectedProducts.map((p) => p._id);

    // Step 4: Delete categories and their products in parallel
    await Promise.all([
      Category.deleteMany({ _id: { $in: allIds } }),
      Product.deleteMany({ _id: { $in: affectedProductIds } }),
    ]);

    return {
      deletedCategoryCount: allIds.length,
      deletedProductCount: affectedProductIds.length,
      deletedCategoryIds: allIds,
      deletedProductIds: affectedProductIds,
      images: [
        ...categoryImages.filter(Boolean),
        ...productImages.filter(Boolean),
      ],
    };
  },

  toggleCategoryStatus: async (id) => {
    const category = await Category.findById(id);

    if (!category) {
      const err = new Error("Category not found");
      err.statusCode = 404;
      throw err;
    }

    const newStatus = category.status === "active" ? "inactive" : "active";

    category.status = newStatus;
    await category.save();

    return category;
  },
};

export default CategoryService;
