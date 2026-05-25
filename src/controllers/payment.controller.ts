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

    if (!rawBody) {
      console.error("Missing rawBody");
      return res.sendStatus(500);
    }

    // 1. Verify signature using raw body
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
      console.error("Invalid JSON webhook:", rawBody);
      return res.sendStatus(500);
    }

    const event = payload?.event;

    if (event !== "charge.success") {
      return res.sendStatus(200);
    }

    const data = payload?.data ?? {};

    const reference = data?.reference;
    const metadata = data?.metadata ?? {};
    const orderId = metadata?.orderId;

    // 3. STRICT validation (do NOT silently accept invalid payloads)
    if (!reference || !orderId) {
      console.error("Invalid Paystack payload (missing fields):", {
        reference,
        orderId,
        payload,
      });

      // return 500 so Paystack retries instead of silently dropping
      return res.sendStatus(500);
    }

    // 4. Fetch order
    const order = await orderService.getOrder(orderId);

    if (!order) {
      return res.sendStatus(200);
    }

    if (order.paymentStatus === "paid") {
      return res.sendStatus(200);
    }

    // 5. Verify transaction (still keeping it as requested)
    const verification = await paystack.verifyTransaction({ reference });

    if (!verification || verification.status !== "success") {
      return res.sendStatus(400);
    }

    // 6. Validate amount
    const expectedAmount = Math.round(
      Number(order.transaction!.totalAmount) * 100,
    );

    if (verification.amount !== expectedAmount) {
      console.error("Amount mismatch:", {
        verificationAmount: verification.amount,
        expectedAmount,
      });

      return res.sendStatus(400);
    }

    // 7. Update order
    await orderService.updateOrder(orderId, {
      paymentStatus: "paid",
    });

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(500);
  }
};

export default { handlePaystackWebhook };
