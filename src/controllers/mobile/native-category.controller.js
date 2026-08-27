import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import NativeCategoryService from "../../services/native-category.service.js";

export const NativeCategoryController = {
  fetchNativeCategories: async (req, res) => {
    try {
      const categories = await NativeCategoryService.getNativeCategoryList();

      return sendSuccess(res, {
        message: "Native categories fetched successfully",
        data: categories,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },

  fetchNativeProductsByCategoryId: async (req, res) => {
    try {
      const { category_id } = req.params;

      const products = await NativeCategoryService.getNativeProuctsByCategoryId(
        {
          category_id,
        },
      );

      return sendSuccess(res, {
        message: "Native products fetched successfully",
        data: products,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },
};

export default NativeCategoryController;
