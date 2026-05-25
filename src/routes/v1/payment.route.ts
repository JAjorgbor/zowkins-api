import express from "express";
import paymentController from "@/controllers/payment.controller.js";

const router = express.Router();

router.post("/paystack/webhook", paymentController.handlePaystackWebhook);

export default router;
