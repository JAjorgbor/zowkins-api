import adminAuthController from "@/controllers/admin.auth.controller.js";
import auth from "@/middlewares/admin-auth.js";
import validate from "@/middlewares/validate.js";
import adminAuthValidation from "@/validation/admin.auth.validation.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.post(
  "/create-account",
  validate(adminAuthValidation.createAccountWithCredentials),
  adminAuthController.createAccountWithCredentials
);
router.post(
  "/login",
  validate(adminAuthValidation.loginWithCredentials),
  adminAuthController.loginWithCredentials
);
router.post("/logout", auth(), adminAuthController.logout);
router.post("/refresh-tokens", adminAuthController.refreshTokens);
router.post(
  "/reset-password",
  validate(adminAuthValidation.resetPassword),
  adminAuthController.resetPassword
);
router.post(
  "/set-new-password/:token",
  validate(adminAuthValidation.setNewPassword),
  adminAuthController.setNewPassword
);

export default router;
