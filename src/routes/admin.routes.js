import express from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import { uploadAdminProfilePicture } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get(
  "/profile",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  AdminController.getProfile,
);

router.patch(
  "/profile",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadAdminProfilePicture,
  AdminController.updateProfile,
);

router.get(
  "/dashboard",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  AdminController.getDashboardData,
);

export default router;
