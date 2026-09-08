import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { SlotbookingController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.post("/check-coverage", SlotbookingController.checkCoverage);
router.get("/available-slots", SlotbookingController.fetchAvailableSlots);
router.get("/booking-slot", SlotbookingController.addSlotBooking);

export default router;
