import portalAuthController from "@/controllers/portal.auth.controller.js";
import portalAuth from "@/middlewares/portal-auth.js";
import validate from "@/middlewares/validate.js";
import {
  passwordResetLimiter,
  portalLoginLimiter,
  resendOtpLimiter,
  signupLimiter,
  verifyEmailLimiter,
} from "@/middlewares/rate-limit.js";
import portalAuthValidation from "@/validation/portal.auth.validation.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.post(
  "/create-account",
  signupLimiter,
  validate(portalAuthValidation.createAccount),
  portalAuthController.createAccount
);
router.post(
  "/verify-email",
  verifyEmailLimiter,
  validate(portalAuthValidation.verifyEmail),
  portalAuthController.verifyEmail
);
router.post(
  "/resend-otp",
  resendOtpLimiter,
  validate(portalAuthValidation.resendOtp),
  portalAuthController.resendOtp
);
router.post(
  "/login",
  portalLoginLimiter,
  validate(portalAuthValidation.login),
  portalAuthController.login
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(portalAuthValidation.resetPassword),
  portalAuthController.resetPassword
);

router.post(
  "/set-new-password/:token",
  validate(portalAuthValidation.setNewPassword),
  portalAuthController.setNewPassword
);

router.post("/logout", portalAuth(), portalAuthController.logout);
router.post("/refresh-tokens", portalAuthController.refreshTokens);

export default router;
