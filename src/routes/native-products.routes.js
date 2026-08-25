import express from "express";
import {NativeProductController} from "../controllers/native-product.controller.js"

const router = express.Router();

//Mobile App APIs
router.get("/mobile", NativeProductController.fetchNativeProductsForMobile);
router.get("/description/mobile", NativeProductController.fetchNativeDescriptionForMobile)

export default router;
