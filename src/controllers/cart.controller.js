// controllers/cart.controller.js
import { CartService } from "../services/cart.service.js";
import { resolveCartIdentity } from "../helpers/resolveCartIdentity.js";

const sendError = (res, code, message) =>
  res.status(code).json({ success: false, code, message, data: null });

export const CartController = {
  /**
   * POST /api/cart/add
   * Works for both logged-in users and guests in one endpoint.
   * Body: { product_id, variant_label?, quantity? }
   */
  addToCart: async (req, res) => {
    try {
      const identity = resolveCartIdentity(req, res); // sets guestId cookie if needed
      const { product_id, variant_label, quantity } = req.body ?? {};

      const data = await CartService.addToCart(identity, {
        product_id,
        variant_label,
        quantity,
      });

      return res.status(200).json({
        success: true,
        code: 200,
        message: "Product added to cart successfully",
        data,
      });
    } catch (err) {
      const msg = err?.message || "Unable to add product to cart";
      const code = msg === "Product not found" ? 404 : 400;
      return sendError(res, code, msg);
    }
  },
};