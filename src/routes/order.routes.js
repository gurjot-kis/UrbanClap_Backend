import express from "express";
import * as orderController from "../controllers/order.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", authorizeRoles(ROLES.USER), orderController.initiateOrder);
router.get("/my-orders", authorizeRoles(ROLES.USER), orderController.getMyOrders);
router.get("/:id", authorizeRoles(ROLES.USER, ROLES.SUPER_ADMIN), orderController.getOrderById);
router.patch("/:id/cancel", authorizeRoles(ROLES.USER), orderController.cancelOrder);

router.patch(
  "/:id/status",
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR),
  orderController.updateOrderStatus,
);

router.get(
  "/admin/all",
  authorizeRoles(ROLES.SUPER_ADMIN),
  orderController.getAllOrdersAdmin,
);

export default router;
