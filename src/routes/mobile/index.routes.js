import express from "express";
import AuthRoutes from "./auth.routes.js";
import UserRoutes from "./user.routes.js";
import CategoryRoutes from "./category.routes.js";
import NativeCategoryRoutes from "./native-category.routes.js";
import CartRoutes from "./cart.routes.js";
import ProductRoutes from "./product.routes.js";
import PageContentRoutes from "./page-content.routes.js";
import AddressRoutes from "./address.routes.js";
import NativeProductRoutes from "./native-products.routes.js";

const router = express.Router();

router.use("/auth", AuthRoutes);
router.use("/user", UserRoutes);
router.use("/category", CategoryRoutes);
router.use("/product", ProductRoutes);
router.use("/native-category", NativeCategoryRoutes);
router.use("/native-product", NativeProductRoutes);
router.use("/cart", CartRoutes);
router.use("/address", AddressRoutes);
router.use(PageContentRoutes);

export default router;
