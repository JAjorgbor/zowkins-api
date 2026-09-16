import orderService from "@/services/order.service.js";
import portalUserService from "@/services/portal.user.service.js";
import ApiError from "@/utils/api-error.js";
import catchAsync from "@/utils/catch-async.js";
import pick from "@/utils/pick.js";
import { type Request, type Response } from "express";
import httpStatus from "http-status";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const { customer } = req.body;
  let payload = req.body;
  if (typeof customer === "object") {
    // New customer details: saved as a guest (or matched to an existing account by email)
    const user = await portalUserService.upsertGuestCustomer(customer);
    payload = {
      ...payload,
      customer: user._id.toString(),
      customerDetails: customer,
    };
  }
  const order = await orderService.createOrder(payload);
  res.status(httpStatus.CREATED).json({ success: true, order });
});

const getOrders = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, [
    "orderStatus",
    "paymentStatus",
    "customer",
    "isGuestOrder",
    "referralPartner",
  ]);
  // Orders created before guest checkout have no isGuestOrder value stored
  if (filter.isGuestOrder !== undefined) {
    filter.isGuestOrder =
      filter.isGuestOrder === "true" ? true : { $ne: true };
  }
  const options = pick(req.query, ["sortBy", "limit", "page"]);

  const orders = await orderService.queryOrders(filter, options);
  res.status(httpStatus.OK).json({ success: true, orders });
});

const generatePaymentLink = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { callbackUrl } = req.body;
  const paymentLink = await orderService.generatePaymentLink(
    orderId as string,
    callbackUrl as string,
  );
  res.status(httpStatus.OK).json({ success: true, paymentLink });
});

const getOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = await orderService.getOrder(orderId as string);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }
  res.status(httpStatus.OK).json({ success: true, order });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const order = await orderService.updateOrder(orderId as string, req.body);
  res.status(httpStatus.OK).json({ success: true, order });
});

const updateOrderProducts = catchAsync(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { products } = req.body;
  const order = await orderService.updateOrderProducts(
    orderId as string,
    products,
  );
  res.status(httpStatus.OK).json({ success: true, order });
});

const getGeneralOrdersStats = catchAsync(
  async (req: Request, res: Response) => {
    const stats = await orderService.getGeneralOrdersStats();
    res.status(httpStatus.OK).json({ success: true, stats });
  },
);

export default {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  updateOrderProducts,
  getGeneralOrdersStats,
  generatePaymentLink,
};
