import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { uploadProductImages } from "../../middlewares/upload.middleware.js";
import { ProductController } from "../../controllers/admin/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.SUPER_ADMIN));

router
  .route("/")
  .get(ProductController.getAllProducts)
  .post(uploadProductImages, ProductController.createProduct);

router
  .route("/:id")
  .get(ProductController.getProductById)
  .put(uploadProductImages, ProductController.updateProduct)
  .delete(ProductController.deleteProduct);

router.patch("/:id/status", ProductController.updateProductStatus);
router.patch("/:id/rating", ProductController.updateProductRating);

export default router;
