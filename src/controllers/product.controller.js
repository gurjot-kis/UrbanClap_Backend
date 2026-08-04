import { ProductService } from "../services/product.service.js";

const sendError = (res, code, message) =>
  res.status(code).json({ success: false, code, message, data: null });

const resolveError = (res, err) => {
  const msg = err?.message || "Something went wrong";
  if (
    [
      "Category not found",
      "Sub-category not found in this category",
      "Product not found",
    ].includes(msg)
  ) {
    return sendError(res, 404, msg);
  }
  if (
    [
      "Invalid product id",
      "Invalid category_id",
      "Invalid sub_category_id",
    ].includes(msg)
  ) {
    return sendError(res, 400, msg);
  }
  return sendError(res, 500, msg);
};

export const ProductController = {
  getProductsBySubCategory: async (req, res) => {
    try {
      const { sub_category_id } = req.params;
      const result = await ProductService.getProductsBySubCategory(
        sub_category_id,
        req.query,
      );
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Products fetched successfully",
        ...result,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  getProductById: async (req, res) => {
    try {
      const data = await ProductService.getProductById(req.params.id);
      return res.status(200).json({
        success: true,
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
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Categories with products fetched successfully",
        ...result,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },
};

export default ProductController;
