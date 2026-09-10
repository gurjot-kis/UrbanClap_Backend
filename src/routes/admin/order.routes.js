import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { OrderController as MobileOrderController } from "../../controllers/mobile/index.controller.js";
import { OrderController } from "../../controllers/admin/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.SUPER_ADMIN));

router.get("/all-orders", OrderController.getAllOrdersAdmin);
router.get("/:id", MobileOrderController.getOrderById);
router.patch("/:id/status", OrderController.updateOrderStatus);

export default router;
