import express from "express";
import { NativeProductController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.get("/", NativeProductController.fetchNativeProductsForMobile);
router.get(
  "/description",
  NativeProductController.fetchNativeDescriptionForMobile,
);
router.get("/:id", NativeProductController.fetchNativeProductDetailForMobile);

export default router;
