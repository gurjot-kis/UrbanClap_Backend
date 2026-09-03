import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";
import vendorRoutes from "./vendor.routes.js";
import vendorSlotRoutes from "./vendorSlot.routes.js";
import slotBookingRoutes from "./slotBooking.routes.js";
import orderRoutes from "./order.routes.js";
import paymentRoutes from "./payment.routes.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use(authRoutes);
router.use(userRoutes);
router.use("/admin", adminRoutes);
router.use("/vendors", vendorRoutes);
router.use("/vendor-slots", vendorSlotRoutes);
router.use("/slot-booking", slotBookingRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);

export default router;
