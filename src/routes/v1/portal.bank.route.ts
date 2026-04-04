import express from "express";
import bankController from "@/controllers/bank.controller.js";
import portalAuth from "@/middlewares/portal-auth.js";

const router = express.Router();

router.route("/").get(portalAuth(), bankController.getBankList);
router
  .route("/validate-account")
  .get(portalAuth(), bankController.validateBankAccount);

export default router;
