import express from "express";
import bankController from "@/controllers/bank.controller.js";
import adminAuth from "@/middlewares/admin-auth.js";

const router = express.Router();

router.route("/").get(adminAuth(), bankController.getBankList);
router
  .route("/validate-account")
  .get(adminAuth(), bankController.validateBankAccount);

export default router;
