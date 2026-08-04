import express from "express";
import { ProductController } from "../controllers/product.controller.js";

const router = express.Router();

router.get(
  "/product/sub/:sub_category_id",
  ProductController.getProductsBySubCategory,
);
router.get("/product/:id", ProductController.getProductById);

router.get("/products-with-cateogory/:category_id", ProductController.getChildCategoriesWithProducts);

export default router;
