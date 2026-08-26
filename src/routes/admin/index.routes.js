import express from "express";
import CategoryRoutes from "./category.routes.js";

const router = express.Router();

router.use("/category", CategoryRoutes);

export default router;
