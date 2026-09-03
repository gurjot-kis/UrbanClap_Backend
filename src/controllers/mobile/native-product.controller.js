import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import NativeProductService from "../../services/native-products.service.js";

export const NativeProductController = {
  fetchNativeProductsForMobile: async (req, res) => {
    try {
      const products =
        await NativeProductService.getNativeProductsListForMobile();

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

  fetchNativeDescriptionForMobile: async (req, res) => {
    try {
      const description =
        await NativeProductService.getNativeDescriptionForMobile();

      return sendSuccess(res, {
        message: "Native description fetched successfully",
        data: description,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },

  fetchNativeProductDetailForMobile: async (req, res) => {
    try {
      const { id } = req.params;
      const product =
        await NativeProductService.getNativeProductDetailForMobile(id);

      return sendSuccess(res, {
        message: "Native product detail fetched successfully",
        data: product,
      });
    } catch (error) {
      return sendError(res, {
        code: error.message === "Product not found" ? 404 : 500,
        message: error.message,
      });
    }
  },
};

export default NativeProductController;
