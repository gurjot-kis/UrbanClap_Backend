import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import CategoryService from "../../services/category.service.js";

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
};

export default CategoryController;
