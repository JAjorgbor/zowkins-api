import orderService from "@/services/order.service.js";
import portalUserService from "@/services/portal.user.service.js";
import catchAsync from "@/utils/catch-async.js";
import httpStatus from "http-status";
import { type Request, type Response } from "express";
import ApiError from "@/utils/api-error.js";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const { customer, items, deliveryAddress, deliveryMethod, callbackUrl } =
    req.body;
  const user = await portalUserService.createPortalUser(customer);

  // const { customer, items, deliveryAddress, deliveryMethod } = req.body as {
  //   customer: string;
  //   items: { productId: string; quantity: number }[];
  //   deliveryAddress: string;
  //   deliveryMethod: string;
  // };
  const { paymentUrl } = await orderService.createOrder({
    customer: user?._id?.toString() as string,
    items,
    deliveryAddress,
    deliveryMethod,
    includePayment: true,
    callbackUrl,
  });
  res.status(httpStatus.OK).json({ success: true, paymentUrl });
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
