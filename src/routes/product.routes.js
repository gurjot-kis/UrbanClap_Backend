import express from "express";
import { ProductController } from "../controllers/product.controller.js";
import { uploadProductImages } from "../middlewares/upload.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

// Admin Panel
router.get(
  "/admin/products",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  ProductController.getAllProducts,
);
router.post(
  "/admin/product",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadProductImages,
  ProductController.createProduct,
);
router.put(
  "/admin/product/:id",
  authMiddleware,
  authorizeRoles(ROLES.SUPER_ADMIN),
  uploadProductImages,
  ProductController.updateProduct,
);
router.patch(
  "/admin/product/:id/status",
  ProductController.updateProductStatus,
);
router.delete("/admin/product/:id", ProductController.deleteProduct);

// temp 
router.patch(
  "/admin/product/:id/rating",
  ProductController.updateProductRating,
);


export default router;
