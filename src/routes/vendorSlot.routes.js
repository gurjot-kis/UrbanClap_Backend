import { Router } from "express";
import {
  addVendorSlot,
  getAllVendorSlots,
  updateVendorSlot,
  deleteVendorSlot,
} from "../controllers/vendorSlot.controller.js";

const router = Router();

router.post("/", addVendorSlot);
router.get("/", getAllVendorSlots);
router.put("/:id", updateVendorSlot);
router.delete("/:id", deleteVendorSlot);

export default router;