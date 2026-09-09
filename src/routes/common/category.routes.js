import express from "express";
import { CategoryController } from "../../controllers/admin/category.controller.js";

const router = express.Router();

router.get("/active", CategoryController.getActiveCategories);

export default router;
