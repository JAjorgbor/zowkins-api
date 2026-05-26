import orderService from "@/services/order.service.js";
import catchAsync from "@/utils/catch-async.js";
import pick from "@/utils/pick.js";
import httpStatus from "http-status";
import { type Request, type Response } from "express";
import ApiError from "@/utils/api-error.js";

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await orderService.createOrder(req.body);
  res.status(httpStatus.CREATED).json({ success: true, order });
});

const getOrders = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, [
    "orderStatus",
    "paymentStatus",
    "customer",
    "referralPartner",
  ]);
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
