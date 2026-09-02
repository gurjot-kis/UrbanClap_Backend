import { sendError, sendSuccess } from "../helpers/response.helper.js";
import { ProductService } from "../services/product.service.js";

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

    // temp
    "Rating average is required",
    "Rating count is required",
    "Invalid rating average",
    "Invalid rating count",
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
  // ─── Admin Panel ────────────────────────────────────────────────────────
  getAllProducts: async (req, res) => {
    try {
      const result = await ProductService.getAllProducts(req.query);
      return sendSuccess(res, {
        code: 200,
        message: "Products fetched successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  createProduct: async (req, res) => {
    try {
      const data = await ProductService.createProduct(req.body, req.files);
      return sendSuccess(res, {
        code: 201,
        message: "Product created successfully",
        data,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  updateProduct: async (req, res) => {
    try {
      const data = await ProductService.updateProduct(
        req.params.id,
        req.body,
        req.files,
      );
      return sendSuccess(res, {
        code: 200,
        message: "Product updated successfully",
        data,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  updateProductStatus: async (req, res) => {
    try {
      const data = await ProductService.updateProductStatus(
        req.params.id,
        req.body.status,
      );
      return sendSuccess(res, {
        code: 200,
        message: "Product status updated successfully",
        data,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const data = await ProductService.deleteProduct(req.params.id);
      return sendSuccess(res, {
        code: 200,
        message: "Product deleted successfully",
        data,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },

  // temp api
  updateProductRating: async (req, res) => {
    try {
      const data = await ProductService.updateProductRating(
        req.params.id,
        req.body,
      );
      return sendSuccess(res, {
        code: 200,
        message: "Product rating updated successfully",
        data,
      });
    } catch (err) {
      return resolveError(res, err);
    }
  },
};

export default ProductController;
