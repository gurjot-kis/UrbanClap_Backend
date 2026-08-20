import { Router } from "express";
import {
  addVendorSlot,
  getAllVendorSlots,
  updateVendorSlot,
  deleteVendorSlot,
  getMyVendorSlots
} from "../controllers/vendorSlot.controller.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authMiddleware);

router.post("/", authorizeRoles(ROLES.VENDOR), addVendorSlot);
router.get("/", getAllVendorSlots);

router.get(
  "/my-slots",
  authorizeRoles(ROLES.VENDOR),
  getMyVendorSlots,
);

router.put("/:id", updateVendorSlot);
router.delete("/:id", deleteVendorSlot);


export default router;
