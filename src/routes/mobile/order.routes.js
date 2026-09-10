import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { OrderController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.get("/my-orders", OrderController.getMyOrders);
router.post("/create-order", OrderController.initiateOrder);
router.get("/:id/order-details", OrderController.getOrderById);
router.patch("/:id/cancel-order", OrderController.cancelOrder);

export default router;
