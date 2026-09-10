import express from "express";
import CategoryRoutes from "./category.routes.js";
import ProductRoutes from "./product.routes.js";
import SynonymRoutes from "./synonym.routes.js";
import OrderRoutes from "./order.routes.js";

const router = express.Router();

router.use("/category", CategoryRoutes);
router.use("/product", ProductRoutes);
router.use("/synonym", SynonymRoutes);
router.use("/order", OrderRoutes);

export default router;
