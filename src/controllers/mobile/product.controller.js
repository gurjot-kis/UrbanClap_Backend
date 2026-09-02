import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import ProductService from "../../services/product.service.js";

const resolveError = (res, err) => {
  const msg = err?.message || "Something went wrong";

  const notFound = [
    "Category not found",
    "Sub-category not found in this category",
    "Product not found",
  ];
  const badRequest = [
    "Invalid product id",
    "Invalid category_id",
    "Invalid sub_category_id",
    "Product name is required",
    "Base price is required",
    "Main image is required",
    "Slug already exists",
    "Invalid variants format",
    "Invalid includes format",
    "Invalid status value",
    "Status is required",
    "Invalid page number",
    "Invalid limit number",
  ];

  if (notFound.includes(msg)) {
    return sendError(res, { code: 404, message: msg });
  }
  if (badRequest.includes(msg)) {
    return sendError(res, { code: 400, message: msg });
  }
  return sendError(res, { code: 500, message: msg, error: err?.message });
};

export const ProductController = {
  getProductById: async (req, res) => {
    try {
      const data = await ProductService.getProductById(req.params.id);
      return sendSuccess(res, {
        code: 200,
        message: "Product fetched successfully",
        data,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  getChildCategoriesWithProducts: async (req, res) => {
    try {
      const { category_id } = req.params;
      const result = await ProductService.getChildCategoriesWithProducts(
        category_id,
        req.query,
      );

      return sendSuccess(res, {
        code: 200,
        message: "Categories with products fetched successfully",
        data: result,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },
};

export default ProductController;