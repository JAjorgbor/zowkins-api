import { z } from "zod";

const getOrders = {
  query: z.object({
    sortBy: z.string().optional(),
    limit: z.coerce.number().int().optional(),
    page: z.coerce.number().int().optional(),
    orderStatus: z
      .enum(["processing", "in-transit", "cancelled", "delivered"])
      .optional(),
    paymentStatus: z
      .enum(["pending", "paid", "failed", "abandoned", "reversed"])
      .optional(),
    customer: z.string().optional(),
    referralPartner: z.string().optional(),
  }),
};

const getOrder = {
  params: z.object({
    orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Order ID"),
  }),
};

const adminGetOrder = {
  params: z.object({
    orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Order ID"),
  }),
};

const updateOrder = {
  params: z.object({
    orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Order ID"),
  }),
  body: z.object({
    orderStatus: z
      .enum(["processing", "in-transit", "cancelled", "delivered"])
      .optional(),
    paymentStatus: z
      .enum(["pending", "paid", "failed", "abandoned", "reversed"])
      .optional(),
    trackingId: z.string().optional(),
    note: z.string().optional(),
    referralCommissionStatus: z
      .enum(["pending", "paid", "cancelled"])
      .optional(),
    referralCommissionNote: z.string().optional(),
  }),
};

const createOrder = {
  body: z.object({
    customer: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Customer ID"),
    items: z
      .array(
        z.object({
          productId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid Product ID"),
          quantity: z.number().int().min(1),
        }),
      )
      .min(1),
    deliveryAddress: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid Address ID"),
    deliveryMethod: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Method ID"),
  }),
};

const updateOrderProducts = {
  params: z.object({
    orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Order ID"),
  }),
  body: z.object({
    products: z
      .array(
        z.object({
          productId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid Product ID"),
          quantity: z.number().int().min(1),
        }),
      )
      .min(1),
  }),
};

export default {
  getOrders,
  getOrder,
  adminGetOrder,
  updateOrder,
  createOrder,
  updateOrderProducts,
};
