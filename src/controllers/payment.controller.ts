import crypto from "crypto";
import config from "@/config/config.js";
import type { Request, Response } from "express";
import orderService from "@/services/order.service.js";
import paystack from "@/config/paystack.js";

type TransactionType = "order" | "subscription";

const handlePaystackWebhook = async (req: Request, res: Response) => {
  const secret = config.paystack.secretKey;

  const signature = req.headers["x-paystack-signature"];

  const hash = crypto
    .createHmac("sha512", secret)
    .update((req as any).rawBody)
    .digest("hex");

  if (hash !== signature) {
    return res.status(401).send("Invalid signature");
  }

  const event = req.body.event;
  const data = req.body.data;
  const metadata = data.metadata;
  const reference = data.reference;

  if (event !== "charge.success") {
    return res.sendStatus(200);
  }

  if (!metadata || metadata.type !== "order") {
    return res.sendStatus(200);
  }

  const order = await orderService.getOrder(metadata.orderId);

  if (!order || order.paymentStatus === "paid") {
    return res.sendStatus(200);
  }

  const verification = await paystack.verifyTransaction({ reference });

  if (
    verification.status !== "success" ||
    verification.amount !== order.transaction!.totalAmount * 100
  ) {
    return res.sendStatus(400);
  }

  await orderService.updateOrder(metadata.orderId, {
    paymentStatus: "paid",
  });

  return res.sendStatus(200);
};

export default { handlePaystackWebhook };
