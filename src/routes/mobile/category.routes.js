import express from "express"
import { CategoryController } from "../../controllers/mobile/index.controller.js";

const router = express.Router()

router.get("/list", CategoryController.getCategories);

export default router