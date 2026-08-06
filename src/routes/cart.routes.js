// routes/cart.routes.js
import express from "express";
import { CartController } from "../controllers/cart.controller.js";
import { optionalAuthMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", optionalAuthMiddleware, CartController.getCart);
router.post("/add", optionalAuthMiddleware, CartController.addToCart);

router.patch("/:item_id/decrement", optionalAuthMiddleware, CartController.decrementItem);
router.delete("/:item_id", optionalAuthMiddleware, CartController.removeItem);

export default router;
