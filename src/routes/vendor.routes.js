import express from "express";
import { VendorController } from "../controllers/vendor.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", authorizeRoles(ROLES.SUPER_ADMIN), VendorController.getVendors);
router.post("/", authorizeRoles(ROLES.SUPER_ADMIN), VendorController.addVendor);
router.get("/:id", authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR), VendorController.getVendorById);
router.put("/:id", authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR), VendorController.updateVendor);
router.patch("/:id/status", authorizeRoles(ROLES.SUPER_ADMIN), VendorController.updateVendorStatus);
router.patch("/:id/verify", authorizeRoles(ROLES.SUPER_ADMIN), VendorController.updateVendorVerification);
router.patch("/:id/availability", authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR), VendorController.updateVendorAvailability);
router.patch("/:id/location", authorizeRoles(ROLES.SUPER_ADMIN, ROLES.VENDOR), VendorController.updateVendorLocation);
router.delete("/:id", authorizeRoles(ROLES.SUPER_ADMIN), VendorController.deleteVendor);

export default router;