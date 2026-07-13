import express from "express";
import { CartController } from "../controllers/cart.controller.js";
import { authMiddleware, optionalAuthMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.post("/public/cart", CartController.addToGuestCart);

router.get("/public/cart", CartController.listGuestCartItems);

router.patch("/public/cart/:product_id", CartController.updateGuestQuantity);

router.delete("/public/cart/:product_id", CartController.deleteGuestCartItem);

router.post(
  "/cart",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  CartController.addToCart
);

router.patch(
  "/cart/:product_id",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  CartController.updateQuantity
);

router.delete(
  "/cart/:product_id",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  CartController.deleteCartItem
);

router.get(
  "/cart/list",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  CartController.listCartItems
);

router.get("/cart", optionalAuthMiddleware, CartController.listCart);

export default router;
