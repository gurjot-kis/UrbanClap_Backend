import express from "express";
import { CartController } from "../../controllers/mobile/cart.controller.js";
import { optionalAuthMiddleware } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(optionalAuthMiddleware);

router.get("/", CartController.getCart);
router.post("/add", CartController.addToCart);
router.patch("/:item_id/decrement", CartController.decrementItem);
router.delete("/:item_id", CartController.removeItem);

export default router;
