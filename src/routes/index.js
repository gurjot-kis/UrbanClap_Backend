import express from "express";
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import productRoutes from "./product.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";
import cartRoutes from "./cart.routes.js";
import addressRoutes from "./address.routes.js";
import vendorRoutes from "./vendor.routes.js";
import vendorSlotRoutes from "./vendorSlot.routes.js";
import slotBookingRoutes from "./slotBooking.routes.js";
import orderRoutes from "./order.routes.js";
import paymentRoutes from "./payment.routes.js";
import nativeCategoryRoutes from "./native-category.routes.js";
import nativeProductRoutes from "./native-products.routes.js";
import PageContentRoutes from "./page-content.routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use(authRoutes);
router.use("/categories", categoryRoutes);
router.use(productRoutes);
router.use(userRoutes);
router.use("/admin", adminRoutes);
router.use("/cart", cartRoutes);
router.use("/address", addressRoutes);
router.use("/vendors", vendorRoutes);
router.use("/vendor-slots", vendorSlotRoutes);
router.use("/slot-booking", slotBookingRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/native-category", nativeCategoryRoutes);
router.use("/native-products", nativeProductRoutes);
router.use("/mobile",PageContentRoutes);

export default router;
