import appController from "@/controllers/app.controller.js";
import auth from "@/middlewares/admin-auth.js";
import validate from "@/middlewares/validate.js";
import appValidation from "@/validation/app.validation.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.get("/", appController.getApp);
router.post(
  "/",
  validate(appValidation.createApp),
  auth("updateApp"),
  appController.createApp,
);
router.patch(
  "/",
  validate(appValidation.updateApp),
  auth("updateApp"),
  appController.updateApp,
);
router.patch(
  "/contact",
  validate(appValidation.updateAppContact),
  auth("updateApp"),
  appController.updateApp,
);
router.post(
  "/upload-hero-image",
  auth("updateApp"),
  appController.uploadHeroImage,
);

export default router;
