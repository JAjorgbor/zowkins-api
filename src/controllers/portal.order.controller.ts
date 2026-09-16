import orderService from "@/services/order.service.js";
import portalUserService from "@/services/portal.user.service.js";
import deliveryAddressService from "@/services/delivery-address.service.js";
import catchAsync from "@/utils/catch-async.js";
import httpStatus from "http-status";
import { type Request, type Response } from "express";
import ApiError from "@/utils/api-error.js";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const {
    customer,
    items,
    deliveryAddress,
    deliveryMethod,
    callbackUrl,
    generatePaymentLink,
  } = req.body;

  // Logged in: the token decides who the customer is, never the request body
  if (req.portalUser) {
    const { paymentLink } = await orderService.createOrder({
      customer: req.portalUser._id.toString(),
      items,
      deliveryAddress,
      deliveryMethod,
      callbackUrl,
      includePayment: generatePaymentLink,
    });
    res.status(httpStatus.OK).json({ success: true, paymentLink });
    return;
  }

  // Guest checkout
  if (!customer) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "customer: first name, last name, email and phone number are required to order without an account",
    );
  }
  if (typeof deliveryAddress === "string") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "deliveryAddress: send the full address when ordering without an account",
    );
  }

  const guest = await portalUserService.upsertGuestCustomer(customer);
  const { paymentLink } = await orderService.createOrder({
    customer: guest._id.toString(),
    customerDetails: customer,
    items,
    deliveryAddress,
    deliveryMethod,
    callbackUrl,
    includePayment: generatePaymentLink,
    isGuestOrder: true,
  });

  // Only guest records get the address saved; anonymous checkouts never edit a registered account
  if (guest.accountType === "guest") {
    await deliveryAddressService.saveDeliveryAddressIfNew(
      guest._id.toString(),
      deliveryAddress,
    );
  }
  res.status(httpStatus.OK).json({ success: true, paymentLink });
});
const requestOrderQuote = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.requestOrderQuote(req);
  res.status(httpStatus.OK).json({ success: true, order });
});

const getOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const user = req.portalUser;
  const userId = user._id.toString();

  const order = await orderService.getOrder(orderId as string);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  // Ensure the order belongs to this user
  if (order.customer._id.toString() !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Forbidden access to this order");
  }

  res.status(httpStatus.OK).json({ success: true, order });
});

const getPortalUserOrders = catchAsync(async (req: Request, res: Response) => {
  const user = req.portalUser as any;
  const orders = await orderService.getPortalUserOrders(user._id.toString());
  res.status(httpStatus.OK).json({ success: true, orders });
});

const getPortalUserRecentOrders = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.portalUser as any;
    const orders = await orderService.getPortalUserRecentOrders(
      user._id.toString(),
    );
    res.status(httpStatus.OK).json({ success: true, orders });
  },
);
const getPortalUserOrderStats = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.portalUser as any;
    const stats = await orderService.getPortalUserOrdersStats(
      user._id.toString(),
    );
    res.status(httpStatus.OK).json({ success: true, stats });
  },
);

export default {
  createOrder,
  getOrder,
  getPortalUserOrders,
  getPortalUserRecentOrders,
  getPortalUserOrderStats,
  requestOrderQuote,
};
