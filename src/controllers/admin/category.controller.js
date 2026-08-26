import mongoose from "mongoose";
import { sendSuccess, sendError } from "../../helpers/response.helper.js";
import CategoryService from "../../services/category.service.js";

export const CategoryController = {
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
};

export default CategoryController;
