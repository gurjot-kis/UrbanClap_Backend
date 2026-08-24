import express from "express";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import subCategoryRoutes from "./sub-category.routes.js";
import productRoutes from "./product.routes.js";
import userRoutes from "./user.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import adminRoutes from "./admin.routes.js";
import cartRoutes from "./cart.routes.js";
import addressRoutes from "./address.routes.js";
import bannerRoutes from "./banner.routes.js";
import cartSettingsRoutes from "./cart-settings.routes.js";
import vendorRoutes from "./vendor.routes.js";
import vendorSlotRoutes from "./vendorSlot.routes.js";
import slotBookingRoutes from "./slotBooking.routes.js";
import orderRoutes from "./order.routes.js";
import paymentRoutes from "./payment.routes.js";
import nativeCategoryRoutes from "./native-category.routes.js"
import nativeProductRoutes from "./native-products.routes.js"

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use(authRoutes);
router.use("/categories", categoryRoutes);
router.use(subCategoryRoutes);
router.use(productRoutes);
router.use(userRoutes);
router.use(dashboardRoutes);
router.use("/admin", adminRoutes);
router.use("/cart", cartRoutes);
router.use("/address", addressRoutes);
router.use(bannerRoutes);
router.use(cartSettingsRoutes);
router.use("/vendors", vendorRoutes);
router.use("/vendor-slots", vendorSlotRoutes);
router.use("/slot-booking", slotBookingRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/native-category", nativeCategoryRoutes)
router.use("/native-products", nativeProductRoutes)

export default router;
