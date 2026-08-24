import express from "express";
import { NativeCategoryController } from "../controllers/native-category.controller.js";

const router = express.Router();

//Mobile App APIs
router.get("/mobile", NativeCategoryController.fetchNativeCategoriesForMobile);

export default router;
