import express from "express";
import AuthRoutes from "./auth.routes.js"
import UserRoutes from "./user.routes.js";
import CategoryRoutes from "./category.routes.js"

const router = express.Router();

router.use("/auth", AuthRoutes)
router.use("/user", UserRoutes);
router.use("/category",CategoryRoutes)

export default router;
