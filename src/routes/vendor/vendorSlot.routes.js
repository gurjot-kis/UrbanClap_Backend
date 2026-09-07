import { Router } from "express";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { VendorSlotController } from "../../controllers/vendor/index.controller.js";

const router = Router();

router.use(authMiddleware, authorizeRoles(ROLES.VENDOR));

router
  .route("/")
  .get(VendorSlotController.getMyVendorSlots)
  .post(VendorSlotController.addVendorSlot);

router
  .route("/:id")
  .put(VendorSlotController.updateVendorSlot)
  .patch(VendorSlotController.updateVendorSlotAvailability)
  .delete(VendorSlotController.deleteVendorSlot);

export default router;
