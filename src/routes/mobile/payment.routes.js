import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { PaymentController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.post("/:orderId/confirm-cod", PaymentController.confirmCodPayment);

export default router;
