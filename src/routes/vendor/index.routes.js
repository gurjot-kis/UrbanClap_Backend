import express from "express";
import VendorServiceRoutes from "./vendorService.routes.js";
import VendorSlotRoutes from "./vendorSlot.routes.js";

const router = express.Router();

router.use("/service", VendorServiceRoutes);
router.use("/vendor-slot", VendorSlotRoutes);

export default router;
