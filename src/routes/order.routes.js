import express from "express";
import * as orderController from "../controllers/order.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.post("/", orderController.initiateOrder); // checkout (COD today)
router.get("/my", orderController.getMyOrders); // ?status=&page=&limit=
router.get("/:id", orderController.getOrderById);
router.patch("/:id/cancel", orderController.cancelOrder);

// ---- admin / vendor routes ----
router.patch(
  "/:id/status",
  authorizeRoles("SuperAdmin", "Vendor"),
  orderController.updateOrderStatus,
);

export default router;
