import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import { uploadCategoryImage } from "../middlewares/upload.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", CategoryController.getCategories);

router.get(
  "/admin",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  CategoryController.getAdminCategories,
);
router.post(
  "/",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadCategoryImage,
  CategoryController.createCategory,
);
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadCategoryImage,
  CategoryController.updateCategory,
);
router.get(
  "/:id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  CategoryController.getCategoryById,
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  CategoryController.deleteCategory,
);

router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  CategoryController.toggleCategoryStatus,
);

export default router;
