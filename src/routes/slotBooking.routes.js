import express from "express";
import {
  addSlotBooking,
  getAllSlotBookings,
  updateSlotBooking,
  deleteSlotBooking,
} from "../controllers/slotBooking.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));

router.route("/").post(addSlotBooking).get(getAllSlotBookings);
router.route("/:id").put(updateSlotBooking).delete(deleteSlotBooking);

export default router;
