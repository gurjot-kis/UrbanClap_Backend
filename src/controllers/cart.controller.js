import { CartService } from "../services/cart.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

const handleCartMutationError = (res, err, fallbackMessage) => {
  const message = err?.message || fallbackMessage;

  if (message === "Product not found" || message === "Cart item not found") {
    return sendError(res, 404, message);
  }

  if (err?.name === "InsufficientStockError") {
    return res.status(400).json({
      success: false,
      code: 400,
      message: err.message,
      data: {
        available_quantity: err.availableQuantity,
        requested_quantity: err.requestedQuantity,
      },
    });
  }

  return sendError(res, 400, message);
};

export const CartController = {
  addToCart: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { product_id, quantity } = req.body || {};

      const data = await CartService.addToCart({ user_id, product_id, quantity });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product added to cart successfully",
        data,
      });
    } catch (err) {
      return handleCartMutationError(res, err, "Unable to add product to cart");
    }
  },

  addToGuestCart: async (req, res) => {
    try {
      const { guest_id, product_id, quantity } = req.body || {};

      const data = await CartService.addToGuestCart({ guest_id, product_id, quantity });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product added to guest cart successfully",
        data,
      });
    } catch (err) {
      return handleCartMutationError(res, err, "Unable to add product to guest cart");
    }
  },

  updateQuantity: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { product_id } = req.params || {};
      const { quantity } = req.body || {};

      const data = await CartService.updateQuantity({ user_id, product_id, quantity });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart quantity updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to update cart quantity";

      if (message === "Product not found" || message === "Cart item not found") {
        return sendError(res, 404, message);
      }

      if (err?.name === "InsufficientStockError") {
        return res.status(400).json({
          success: false,
          code: 400,
          message: err.message,
          data: {
            available_quantity: err.availableQuantity,
            requested_quantity: err.requestedQuantity,
          },
        });
      }

      return sendError(res, 400, message);
    }
  },

  deleteCartItem: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { product_id } = req.params || {};

      const data = await CartService.deleteCartItem({ user_id, product_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart item deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to delete cart item";

      if (message === "Cart item not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  listCartItems: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const data = await CartService.listCartItems({ user_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart list fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch cart list";
      return sendError(res, 400, message);
    }
  },

  /** GET /api/cart — logged-in user cart, or guest cart when guest_id is provided. */
  listCart: async (req, res) => {
    try {
      if (req.user?.user_id) {
        return CartController.listCartItems(req, res);
      }

      const guest_id = req.query?.guest_id;
      if (!guest_id || !String(guest_id).trim()) {
        return sendError(res, 400, "guest_id is required when not logged in");
      }

      const data = await CartService.listGuestCartItems({ guest_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart list fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch cart list";
      return sendError(res, 400, message);
    }
  },

  listGuestCartItems: async (req, res) => {
    try {
      const guest_id = req.query?.guest_id || req.body?.guest_id;
      const data = await CartService.listGuestCartItems({ guest_id });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Cart list fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch cart list";
      return sendError(res, 400, message);
    }
  },

  updateGuestQuantity: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const { guest_id, quantity } = req.body || {};

      const data = await CartService.updateGuestQuantity({
        guest_id,
        product_id,
        quantity,
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Guest cart quantity updated successfully",
        data,
      });
    } catch (err) {
      return handleCartMutationError(res, err, "Unable to update guest cart quantity");
    }
  },

  deleteGuestCartItem: async (req, res) => {
    try {
      const { product_id } = req.params || {};
      const guest_id = req.query?.guest_id || req.body?.guest_id;

      const data = await CartService.deleteGuestCartItem({ guest_id, product_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Guest cart item deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to delete guest cart item";

      if (message === "Cart item not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },
};

export default CartController;
