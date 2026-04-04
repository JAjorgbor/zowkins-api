import portalUserController from "@/controllers/portal.user.controller.js";
import portalAuth from "@/middlewares/portal-auth.js";
import validate from "@/middlewares/validate.js";
import portalUserValidation from "@/validation/portal.user.validation.js";

import express, { Router } from "express";

const router: Router = express.Router();

router.get("/me", portalAuth(), portalUserController.getPortalUser);

router.patch(
  "/me",
  portalAuth(),
  validate(portalUserValidation.upatePortalUser),
  portalUserController.updatePortalUser,
);

router.patch(
  "/me/password",
  portalAuth(),
  validate(portalUserValidation.updatePortalUserPassword),
  portalUserController.updatePortalUserPassword,
);

export default router;
