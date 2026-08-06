import { CartService } from "../services/cart.service.js";
import { resolveCartIdentity } from "../helpers/resolveCartIdentity.js";
import { sendError, sendSuccess } from "../helpers/response.helper.js";

export const CartController = {
  addToCart: async (req, res) => {
    try {
      const identity = resolveCartIdentity(req, res);
      const { product_id, variant_key, quantity } = req.body ?? {};

      const data = await CartService.addToCart(identity, {
        product_id,
        variant_key,
        quantity,
      });

      return sendSuccess(res, {
        code: 200,
        message: "Product added to cart successfully",
        data,
      });
    } catch (err) {
      const msg = err?.message || "Unable to add product to cart";
      const code = msg === "Product not found" ? 404 : 400;
      return sendError(res, {
        code,
        message: msg,
      });
    }
  },

  getCart: async (req, res) => {
    try {
      const identity = resolveCartIdentity(req, res);
      const data = await CartService.getCart(identity);

      return sendSuccess(res, {
        code: 200,
        message: "Cart fetched successfully",
        data,
      });
    } catch (err) {
      const msg = err?.message || "Unable to fetch cart";

      return sendError(res, {
        code: 400,
        message: msg,
      });
    }
  },

  removeItem: async (req, res) => {
    try {
      const identity = resolveCartIdentity(req, res);
      const { item_id } = req.params;

      const data = await CartService.removeItem(identity, { item_id });

      return sendSuccess(res, {
        code: 200,
        message: "Item removed from cart successfully",
        data,
      });
    } catch (err) {
      const msg = err?.message || "Unable to remove item from cart";
      const code =
        msg === "Cart item not found" || msg === "Cart not found" ? 404 : 400;
      return sendError(res, { code, message: msg });
    }
  },

  decrementItem: async (req, res) => {
    try {
      const identity = resolveCartIdentity(req, res);
      const { item_id } = req.params;
      const { quantity } = req.body ?? {};

      const data = await CartService.decrementItem(identity, {
        item_id,
        quantity,
      });

      return sendSuccess(res, {
        code: 200,
        message: data.itemRemoved
          ? "Item removed from cart successfully"
          : "Cart item quantity updated",
        data,
      });
    } catch (err) {
      const msg = err?.message || "Unable to update cart item";
      const code =
        msg === "Cart item not found" || msg === "Cart not found" ? 404 : 400;
      return sendError(res, { code, message: msg });
    }
  },
};
