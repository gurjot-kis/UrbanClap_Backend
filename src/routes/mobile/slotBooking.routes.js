import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { SlotbookingController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.post("/check-coverage", SlotbookingController.checkCoverage);
router.get("/available-slots", SlotbookingController.fetchAvailableSlots);
router.post("/booking-slot", SlotbookingController.addSlotBooking);

router
  .route("/booking-slot/:id")
  .put(SlotbookingController.updateSlotBooking)
  .delete(SlotbookingController.deleteSlotBooking);

router.patch("/:id/cancel", SlotbookingController.cancelSlotBooking);

export default router;
