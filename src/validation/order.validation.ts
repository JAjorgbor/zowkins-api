import customValidation from "@/validation/custom.validation.js";
import { deliveryAddressBody } from "@/validation/delivery-address.validation.js";
import { z } from "zod";

const objectId = (message: string) =>
  z.string().regex(/^[0-9a-fA-F]{24}$/, message);

// Contact details for a customer who isn't logged in (guest checkout, quotes,
// or an admin ordering for someone new). Saved/looked up by email.
const customerDetails = z.object({
  firstName: customValidation.required(z.string(), "First name is required"),
  lastName: customValidation.required(z.string(), "Last name is required"),
  gender: z.enum(["male", "female"]).optional(),
  email: customValidation.email,
  phoneNumber: customValidation.required(z.string(), "Phone number is required"),
});

// Either the id of an address saved on the customer, or a full address
const orderDeliveryAddress = z.union([
  objectId("Invalid Address ID"),
  deliveryAddressBody,
]);

const orderItems = z
  .array(
    z.object({
      productId: objectId("Invalid Product ID"),
      quantity: z.number().int().min(1),
    }),
  )
  .min(1);

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
    isGuestOrder: z.enum(["true", "false"]).optional(),
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

// Open to guests. Logged-in customers are identified by their token; guests must
// send `customer` and a full `deliveryAddress` (enforced in the controller, which
// knows whether a token was sent).
const createOrder = {
  body: z.object({
    customer: customerDetails.optional(),
    items: orderItems,
    deliveryAddress: orderDeliveryAddress,
    deliveryMethod: objectId("Invalid Method ID"),
    callbackUrl: z.url().optional(),
    generatePaymentLink: z.boolean().optional(),
  }),
};
const adminCreateOrder = {
  body: z.object({
    customer: z.union([objectId("Invalid Customer ID"), customerDetails]),
    items: orderItems,
    deliveryAddress: orderDeliveryAddress,
    deliveryMethod: objectId("Invalid Method ID"),
    callbackUrl: z.url().optional(),
    generatePaymentLink: z.boolean().optional(),
  }),
};
// Multipart form fields (validated inside handleAssetUpload). Same customer rules as createOrder.
const requestOrderQuote = z.object({
  customer: customerDetails.optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().min(1),
      }),
    )
    .optional(),
  deliveryAddress: orderDeliveryAddress,
  note: z.string().optional(),
});

const generatePaymentLink = {
  params: z.object({
    orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Order ID"),
  }),
  body: z.object({
    callbackUrl: customValidation.required(z.url(), "Callback URL is required"),
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
  generatePaymentLink,
  adminCreateOrder,
};
