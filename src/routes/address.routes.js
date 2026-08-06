import express from "express";
import { AddressController } from "../controllers/address.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../middlewares/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles(ROLES.USER));

router
  .route("/")
  .post(AddressController.addAddress)
  .get(AddressController.listAddresses);

router
  .route("/:id")
  .get(AddressController.getAddressById)
  .put(AddressController.updateAddress)
  .delete(AddressController.deleteAddress);

router.patch("/:id/default", AddressController.setDefaultAddress);

export default router;
