import express from "express";
import * as paymentController from "../controllers/payment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.post("/:orderId/confirm", paymentController.confirmOrderPayment);

export default router;