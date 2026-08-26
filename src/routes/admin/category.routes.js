import express from "express";
import { CategoryController } from "../../controllers/admin/index.controller.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import authMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.SUPER_ADMIN));

router.get("/", CategoryController.getAdminCategories);

export default router;
