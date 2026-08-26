import express from "express";
import { AuthController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.post("/login_twilio_otp", AuthController.loginTwilioOtp);
router.post("/login_twilio_otp_verify", AuthController.loginTwilioOtpVerify);

export default router;
