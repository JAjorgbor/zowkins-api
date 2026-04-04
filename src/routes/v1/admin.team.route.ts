import adminTeamController from "@/controllers/admin.team.controller.js";
import express, { Router } from "express";
import auth from "@/middlewares/admin-auth.js";
import validate from "@/middlewares/validate.js";
import adminTeamValidation from "@/validation/admin.team.validation.js";

const router: Router = express.Router();

router.get("/", auth("getAdminUsers"), adminTeamController.getAdminUsers);

router.post(
  "/invite-member",
  auth("adminUserInvite"),
  validate(adminTeamValidation.adminUserInvite),
  adminTeamController.adminUserInvite
);

router.post(
  "/accept-invite/:token",
  validate(adminTeamValidation.acceptInvite),
  adminTeamController.acceptInvite
);

router.post(
  "/resend-invite/:id",
  auth("adminUserInvite"),
  validate(adminTeamValidation.resendAdminUserInvite),
  adminTeamController.resendAdminUserInvite
);

router.patch(
  "/:id",
  auth("updateAdminUser"),
  validate(adminTeamValidation.updateAdminUser),
  adminTeamController.updateAdminUser
);

router.delete(
  "/:id",
  auth("removeAdminUser"),
  validate(adminTeamValidation.removeAdminUser),
  adminTeamController.removeAdminUser
);

export default router;
