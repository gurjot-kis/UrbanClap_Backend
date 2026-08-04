import express from "express";
import { CategoryController } from "../controllers/category.controller.js";
// import { authMiddleware } from "../middlewares/auth.middleware.js";
// import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
// import { uploadCategoryImage } from "../middlewares/upload.middleware.js";

const router = express.Router();


//router.get("/", getCategories);

router.get("/categories/public", CategoryController.getCategories);

// router.post(
//   "/categories",
//   authMiddleware,
//   authorizeRoles(ROLES.SUPER_ADMIN),
//   uploadCategoryImage,
//   CategoryController.createCategory
// );
// router.get("/categories/public", CategoryController.getCategories);
// router.get(
//   "/categories",
//   authMiddleware,
//   authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER, ROLES.VENDOR),
//   CategoryController.getCategories
// );
// router.get(
//   "/categories/:category_id",
//   authMiddleware,
//   authorizeRoles(ROLES.SUPER_ADMIN, ROLES.USER, ROLES.VENDOR),
//   CategoryController.getCategoryById
// );
// router.put(
//   "/categories/:category_id",
//   authMiddleware,
//   authorizeRoles(ROLES.SUPER_ADMIN),
//   uploadCategoryImage,
//   CategoryController.updateCategory
// );
// router.delete(
//   "/categories/:category_id",
//   authMiddleware,
//   authorizeRoles(ROLES.SUPER_ADMIN),
//   CategoryController.deleteCategory
// );

export default router;

