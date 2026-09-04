import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { SlotbookingController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.get("/available-slots", SlotbookingController.fetchAvailableSlots);

export default router;
