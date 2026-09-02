import express from "express";
import { CategoryController } from "../../controllers/admin/index.controller.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { uploadCategoryImage } from "../../middlewares/upload.middleware.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.SUPER_ADMIN));

router.get("/", CategoryController.getAdminCategories);
router.get("/active", CategoryController.getActiveCategories);
router.post("/", uploadCategoryImage, CategoryController.createCategory);

router.get("/:id", CategoryController.getCategoryById);
router.put("/:id", uploadCategoryImage, CategoryController.updateCategory);
router.delete("/:id", CategoryController.deleteCategory);
router.patch("/:id/status", CategoryController.toggleCategoryStatus);

export default router;
