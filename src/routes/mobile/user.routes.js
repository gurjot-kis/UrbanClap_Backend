import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { UserController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.get(
  "/profile",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  UserController.getMyProfile,
);

router.put(
  "/profile",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  UserController.updateUserProfile,
);

router.post(
  "/profile/verify-email",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  UserController.verifyEmailOtp,
);

export default router;
