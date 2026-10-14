import crypto from "crypto";
import config from "@/config/config.js";
import type { Request, Response } from "express";
import orderService from "@/services/order.service.js";
import paystack from "@/config/paystack.js";

type PaymentStatus = "pending" | "paid" | "failed" | "abandoned" | "reversed";

const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    const secret = config.paystack.secretKey;
    const signature = req.headers["x-paystack-signature"] as string;

    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      console.error("Missing rawBody");
      return res.sendStatus(500);
    }

    // Verify signature
    const hash = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (!signature || hash !== signature) {
      return res.status(401).send("Invalid signature");
    }

    const payload = JSON.parse(rawBody);

    const event = payload?.event;
    const data = payload?.data ?? {};
    const reference = data?.reference;
    const metadata = data?.metadata ?? {};
    const orderId = metadata?.orderId;

    if (!reference || !orderId) {
      console.error("Invalid Paystack payload:", payload);
      return res.sendStatus(200);
    }

    const order = await orderService.getOrder(orderId);

    if (!order) return res.sendStatus(200);

    // Prevent duplicate processing
    if (order.paymentStatus === "paid") {
      return res.sendStatus(200);
    }

    let newStatus: PaymentStatus = "pending";

    switch (event) {
      case "charge.success": {
        const verification = await paystack.verifyTransaction({ reference });

        if (!verification || verification.status !== "success") {
          newStatus = "failed";
          break;
        }

        const expectedAmount = Math.round(
          Number(order.transaction!.totalAmount) * 100,
        );

        if (verification.amount !== expectedAmount) {
          console.error("Amount mismatch:", {
            verificationAmount: verification.amount,
            expectedAmount,
          });

          newStatus = "failed";
          break;
        }

        newStatus = "paid";
        break;
      }

      case "charge.failed": {
        newStatus = "failed";
        break;
      }

      case "charge.abandoned": {
        newStatus = "abandoned";
        break;
      }

      case "transaction.reversed": {
        newStatus = "reversed";
        break;
      }

      default: {
        return res.sendStatus(200);
      }
    }

    // Only update if status actually changes or is meaningful
    if (newStatus && newStatus !== order.paymentStatus) {
      await orderService.updateOrder(orderId, {
        paymentStatus: newStatus,
      });
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(500);
  }
};

export default { handlePaystackWebhook };
