import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { SocialAuthController } from "../controllers/social-auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/signup", AuthController.signup);
router.post("/login", AuthController.login);
router.post("/logout", authMiddleware, AuthController.logout);
router.post("/change-password", authMiddleware, AuthController.changePassword);

// Forgot password flow
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/reset-password", AuthController.resetPassword);

// Social auth
router.post("/auth/social", SocialAuthController.socialAuth);

export default router;
