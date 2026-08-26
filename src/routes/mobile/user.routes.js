import express from "express";
import { UserController } from "../../controllers/mobile/user.controller.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";

const router = express.Router();

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
