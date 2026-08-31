import express from "express";
import AuthRoutes from "./auth.routes.js"
import UserRoutes from "./user.routes.js";
import CategoryRoutes from "./category.routes.js"
import NativeCategoryRoutes from "./native-category.routes.js"
import CartRoutes from "./cart.routes.js"

const router = express.Router();

router.use("/auth", AuthRoutes)
router.use("/user", UserRoutes);
router.use("/category",CategoryRoutes)
router.use("/native-category", NativeCategoryRoutes);
router.use("/cart", CartRoutes);

export default router;
