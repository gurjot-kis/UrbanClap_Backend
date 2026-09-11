import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { VendorServiceController } from "../../controllers/vendor/vendorService.controller.js";

const router = express.Router();

router.use(authMiddleware, authorizeRoles(ROLES.VENDOR));

router
  .route("/")
  .get(VendorServiceController.getMyServices)
  .post(VendorServiceController.addVendorServices);

router.get(
  "/all-services",
  VendorServiceController.getAllMyServicesWithoutPagination,
);

router
  .route("/:service_id")
  .patch(VendorServiceController.toggleVendorService)
  .delete(VendorServiceController.removeVendorService);

export default router;
