import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { sendError, sendSuccess } from "../helpers/response.helper.js";
import { CategoryService } from "../services/category.service.js";

export const CategoryController = {
  getCategories: async (req, res) => {
    try {
      const categories = await CategoryService.getCategoryTree();

      return sendSuccess(res, {
        message: "Categories fetched successfully",
        data: categories,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },

  getAdminCategories: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "", level = "" } = req.query;

      const result = await CategoryService.getAdminCategoryTree({
        page,
        limit,
        search,
        level,
      });

      return sendSuccess(res, {
        message: "Categories fetched successfully",
        data: result.categories,
        pagination: result.pagination,
      });
    } catch (error) {
      return sendError(res, {
        code: error.statusCode || 500,
        message: error.message,
      });
    }
  },

  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, {
          code: 400,
          message: "Invalid category id",
        });
      }

      const category = await CategoryService.getCategoryById(id);

      if (!category) {
        return sendError(res, {
          code: 404,
          message: "Category not found",
        });
      }

      return sendSuccess(res, {
        message: "Category fetched successfully",
        data: category,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },

  createCategory: async (req, res) => {
    try {
      const { name, parent_id, description, slotConfig } = req.body;

      if (!name || !name.trim()) {
        return sendError(res, {
          code: 400,
          message: "Category name is required",
        });
      }

      if (parent_id && !mongoose.Types.ObjectId.isValid(parent_id)) {
        return sendError(res, {
          code: 400,
          message: "Invalid parent category id",
        });
      }

      const category_image = req.file
        ? `/uploads/categories/${req.file.filename}`
        : "";

      let parsedSlotConfig = slotConfig;
      if (typeof slotConfig === "string") {
        try {
          parsedSlotConfig = JSON.parse(slotConfig);
        } catch {
          return sendError(res, {
            code: 400,
            message: "Invalid slotConfig JSON",
          });
        }
      }

      const category = await CategoryService.createCategory({
        name,
        parent_id,
        description,
        category_image,
        slotConfig: parsedSlotConfig,
      });

      return sendSuccess(res, {
        code: 200,
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      return sendError(res, {
        code: error.statusCode || 500,
        message: error.message,
      });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, {
          code: 400,
          message: "Invalid category id",
        });
      }

      const { name, parent_id, description, slotConfig, remove_image } =
        req.body;

      if (name !== undefined && !name.trim()) {
        return sendError(res, {
          code: 400,
          message: "Category name cannot be empty",
        });
      }

      if (
        parent_id &&
        !mongoose.Types.ObjectId.isValid(parent_id) &&
        parent_id !== ""
      ) {
        return sendError(res, {
          code: 400,
          message: "Invalid parent category id",
        });
      }

      // Determine category_image value:
      // 1. New file uploaded -> new file path
      // 2. Explicitly removed -> null (clears DB field)
      // 3. Untouched -> undefined (preserves current DB value)

      let category_image = undefined
      if(req.file){
        category_image = `/uploads/categories/${req.file.filename}` 
      } else if (remove_image === 'true' || remove_image === true){
        category_image = null
      }

      let parsedSlotConfig = slotConfig;
      if (typeof slotConfig === "string") {
        try {
          parsedSlotConfig = JSON.parse(slotConfig);
        } catch {
          return sendError(res, {
            code: 400,
            message: "Invalid slotConfig JSON",
          });
        }
      }

      const category = await CategoryService.updateCategory(id, {
        name,
        parent_id,
        description,
        category_image,
        slotConfig: parsedSlotConfig,
      });

      return sendSuccess(res, {
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      return sendError(res, {
        code: error.statusCode || 500,
        message: error.message,
      });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, {
          code: 400,
          message: "Invalid category id",
        });
      }

      const result = await CategoryService.deleteCategory(id);

      // Clean up all images (category + product) from disk
      result.images.forEach((imgPath) => {
        const fullPath = path.join(process.cwd(), imgPath);
        fs.unlink(fullPath, (err) => {
          if (err)
            console.error(`Failed to delete image: ${fullPath}`, err.message);
        });
      });

      // Build a descriptive message
      const categoryMsg =
        result.deletedCategoryCount > 1
          ? `${result.deletedCategoryCount} categories`
          : "1 category";

      const productMsg =
        result.deletedProductCount > 0
          ? ` and ${result.deletedProductCount} associated product${result.deletedProductCount > 1 ? "s" : ""}`
          : "";

      return sendSuccess(res, {
        message: `${categoryMsg}${productMsg} deleted successfully`,
        data: {
          deletedCategoryCount: result.deletedCategoryCount,
          deletedProductCount: result.deletedProductCount,
          deletedCategoryIds: result.deletedCategoryIds,
          deletedProductIds: result.deletedProductIds,
        },
      });
    } catch (error) {
      return sendError(res, {
        code: error.statusCode || 500,
        message: error.message,
      });
    }
  },

  toggleCategoryStatus: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return sendError(res, {
          code: 400,
          message: "Invalid category id",
        });
      }

      const category = await CategoryService.toggleCategoryStatus(id);

      return sendSuccess(res, {
        message: `Category status changed to ${category.status}`,
        data: category,
      });
    } catch (error) {
      return sendError(res, {
        code: error.statusCode || 500,
        message: error.message,
      });
    }
  },
};

export default CategoryController;
