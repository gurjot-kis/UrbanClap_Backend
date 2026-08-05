// routes/cart.routes.js
import express from "express";
import { CartController } from "../controllers/cart.controller.js";
import { optionalAuthMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * POST /api/cart/add
 * Single unified endpoint — works for guests and logged-in users.
 * optionalAuthMiddleware populates req.user if token is present; otherwise skips.
 */
router.post("/add", optionalAuthMiddleware, CartController.addToCart);

export default router;
