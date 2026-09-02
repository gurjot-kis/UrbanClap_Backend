import express from "express";
import { ProductController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.get("/:id", ProductController.getProductById);
router.get(
  "/products-with-category/:category_id",
  ProductController.getChildCategoriesWithProducts,
);

export default router;
