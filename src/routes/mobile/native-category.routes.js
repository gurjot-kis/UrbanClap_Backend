import express from "express";
import { NativeCategoryController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.get("/", NativeCategoryController.fetchNativeCategories);
router.get(
  "/:category_id/products",
  NativeCategoryController.fetchNativeProductsByCategoryId,
);

export default router;
