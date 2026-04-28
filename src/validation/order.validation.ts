import customValidation from "@/validation/custom.validation.js";
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
    customer: z.object({
      firstName: customValidation.required(
        z.string(),
        "First name is required",
      ),
      lastName: customValidation.required(z.string(), "Last name is required"),
      gender: z.enum(["male", "female"]).optional(),
      email: customValidation.email,
      phoneNumber: customValidation.required(
        z.string(),
        "Phone number is required",
      ),
    }),

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
    deliveryAddress: z.object({
      label: z.string().min(1),
      phoneNumber: z.string().min(9),
      street: z.string().min(3),
      city: z.string().min(2),
      state: z.string().min(2),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    }),
    deliveryMethod: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Method ID"),
  }),
};
const requestOrderQuote = z.object({
  customer: z.object({
    firstName: customValidation.required(z.string(), "First name is required"),
    lastName: customValidation.required(z.string(), "Last name is required"),
    gender: z.enum(["male", "female"]).optional(),
    email: customValidation.email,
    phoneNumber: customValidation.required(
      z.string(),
      "Phone number is required",
    ),
  }),

  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
  deliveryAddress: z.object({
    label: z.string().min(1),
    phoneNumber: z.string().min(9),
    street: z.string().min(3),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }),
});

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
  note: z.string().optional(),
};

export default {
  getOrders,
  getOrder,
  adminGetOrder,
  updateOrder,
  createOrder,
  updateOrderProducts,
  requestOrderQuote,
};
