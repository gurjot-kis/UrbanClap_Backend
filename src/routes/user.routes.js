import express from "express";
import { UserController } from "../controllers/user.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.patch(
  "/user/location",
  authMiddleware,
  authorizeRoles(ROLES.USER),
  UserController.updateUserLocation,
);


router.get(
  "/users",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  UserController.getUsers,
);

router.post(
  "/users",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  UserController.addUser,
);

router.get(
  "/users/:user_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  UserController.getUserById,
);

router.put(
  "/users/:user_id",
  authMiddleware,
  // authorizeRoles(ROLES.SUPER_ADMIN),
  UserController.updateUser,
);

router.patch(
  "/users/:user_id/status",
  authMiddleware,
  UserController.updateUserStatusByAdmin,
);

router.delete(
  "/users/:user_id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  UserController.deleteUser,
);

export default router;
