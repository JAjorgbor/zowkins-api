import crypto from "crypto";
import config from "@/config/config.js";
import type { Request, Response } from "express";
import orderService from "@/services/order.service.js";
import paystack from "@/config/paystack.js";

const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    const secret = config.paystack.secretKey;
    const signature = req.headers["x-paystack-signature"] as string;

    const rawBody = (req as any).rawBody;

    // 1. Verify signature using RAW body (source of truth)
    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (!signature || hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    // 2. Parse ONLY raw body
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      console.error("Invalid webhook JSON:", rawBody);
      return res.sendStatus(200);
    }

    const event = payload?.event;
    if (event !== "charge.success") {
      return res.sendStatus(200);
    }

    const data = payload?.data ?? {};
    const metadata = data?.metadata;

    const reference = data?.reference;

    if (!reference || typeof reference !== "string") {
      console.error("Missing reference in webhook:", payload);
      return res.sendStatus(200);
    }

    if (!metadata || metadata.type !== "order") {
      return res.sendStatus(200);
    }

    const order = await orderService.getOrder(metadata.orderId);

    if (!order || order.paymentStatus === "paid") {
      return res.sendStatus(200);
    }

    // 3. Verify transaction (still kept as requested)
    const verification = await paystack.verifyTransaction({ reference });

    if (!verification || verification.status !== "success") {
      return res.sendStatus(400);
    }

    const expectedAmount = Math.round(
      Number(order.transaction!.totalAmount) * 100,
    );

    if (verification.amount !== expectedAmount) {
      console.log("Amount mismatch:", {
        verificationAmount: verification.amount,
        expectedAmount,
      });
      return res.sendStatus(400);
    }

    await orderService.updateOrder(metadata.orderId, {
      paymentStatus: "paid",
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(500);
  }
};

export default { handlePaystackWebhook };
