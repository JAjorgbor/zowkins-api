import Order from "@/models/order.model.js";
import Product from "@/models/product.model.js";
import deliveryAddressService from "@/services/delivery-address.service.js";
import deliveryMethodService from "@/services/delivery-method.service.js";
import portalUserService from "@/services/portal.user.service.js";
import referralPartnerService from "@/services/referral-partner.service.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";

const createOrder = async ({
  customer,
  items,
  deliveryAddress,
  deliveryMethod,
}: {
  customer: string;
  items: { productId: string; quantity: number }[];
  deliveryAddress: string;
  deliveryMethod: string;
}) => {
  const portalUser = await portalUserService.getPortalUser({ _id: customer });
  if (!portalUser)
    throw new ApiError(httpStatus.NOT_FOUND, "Portal User not found");

  let referralPartner = undefined;
  if (portalUser.referredBy) {
    referralPartner = await referralPartnerService.getReferralPartner({
      _id: portalUser.referredBy,
    });
  }

  const deliveryAddressDetails =
    await deliveryAddressService.getDeliveryAddressById(
      portalUser._id.toString(),
      deliveryAddress,
    );
  if (!deliveryAddressDetails)
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery Address not found");

  const deliveryMethodDetails = await deliveryMethodService.getDeliveryMethod({
    _id: deliveryMethod,
  });
  if (!deliveryMethodDetails)
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery Method not found");
  const fetchedProducts = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
  });

  if (fetchedProducts.length !== items.length) {
    throw new ApiError(httpStatus.NOT_FOUND, "Some products not found");
  }
  const subTotal = items.reduce(
    (total, item) =>
      total +
      fetchedProducts.find(
        (product) => product._id.toString() === item.productId,
      )!.price *
        item.quantity,
    0,
  );

  const totalAmount = subTotal + (deliveryMethodDetails.fee || 0);
  const normalizedItems = items.map((item) => {
    const thisProduct = fetchedProducts.find(
      (product) => product._id.toString() === item.productId,
    );
    return {
      productId: thisProduct?._id,
      productImage: thisProduct?.image,
      quantity: item.quantity,
      price: thisProduct?.price,
      amount: thisProduct!.price * item.quantity,
      productName: thisProduct?.name,
    };
  });

  let referralDetails: any = undefined;
  if (referralPartner) {
    referralDetails = {
      referralPartner: referralPartner?._id,
      accountDetails: referralPartner.accountDetails,
      commission: {
        rate: referralPartner?.commission!.rate,
        rateType: referralPartner?.commission!.rateType,
        amount: totalAmount * (referralPartner?.commission!.rate / 100),
        status: "pending",
        note: "",
      },
    };
  }

  const order = await Order.create({
    customer,
    products: normalizedItems,
    deliveryAddress: deliveryAddressDetails,
    referralDetails,
    transaction: {
      subTotal,
      totalAmount,
      deliveryFee: deliveryMethodDetails.fee,
    },
    deliveryMethod: deliveryMethodDetails,
  });
  return order;
};

const getPortalUserOrders = async (portalUserId: string) => {
  const portalUser = await portalUserService.getPortalUser({
    _id: portalUserId,
  });
  if (!portalUser)
    throw new ApiError(httpStatus.NOT_FOUND, "Portal User not found");
  const orders = await Order.find({ customer: portalUser._id.toString() })
    .sort({ createdAt: -1 })
    .populate("customer", "firstName lastName email phoneNumber")
    .populate({
      path: "referralDetails.referralPartner",
      populate: {
        path: "user",
        select: "_id firstName lastName email phoneNumber",
      },
    });
  return orders;
};
const getPortalUserRecentOrders = async (portalUserId: string) => {
  const portalUser = await portalUserService.getPortalUser({
    _id: portalUserId,
  });
  if (!portalUser)
    throw new ApiError(httpStatus.NOT_FOUND, "Portal User not found");
  const orders = await Order.find({ customer: portalUser._id.toString() })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("customer", "firstName lastName email phoneNumber")
    .populate({
      path: "referralDetails.referralPartner",
      populate: {
        path: "user",
        select: "_id firstName lastName email phoneNumber",
      },
    });
  return orders;
};
const getPortalUserOrdersStats = async (portalUserId: string) => {
  const portalUser = await portalUserService.getPortalUser({
    _id: portalUserId,
  });
  if (!portalUser)
    throw new ApiError(httpStatus.NOT_FOUND, "Portal User not found");

  const totalOrders = await Order.countDocuments({
    customer: portalUser._id.toString(),
  });
  const processing = await Order.countDocuments({
    customer: portalUser._id.toString(),
    orderStatus: "processing",
  });
  const delivered = await Order.countDocuments({
    customer: portalUser._id.toString(),
    orderStatus: "delivered",
  });
  const cancelled = await Order.countDocuments({
    customer: portalUser._id.toString(),
    orderStatus: "cancelled",
  });
  const inTransit = await Order.countDocuments({
    customer: portalUser._id.toString(),
    orderStatus: "in-transit",
  });
  const totalSpent = await Order.aggregate([
    {
      $match: { customer: portalUser._id, paymentStatus: "paid" },
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: "$transaction.totalAmount" },
      },
    },
  ]);
  return {
    totalOrders,
    processing,
    delivered,
    cancelled,
    inTransit,
    totalSpent: totalSpent[0]?.totalSpent || 0,
  };
};
const getGeneralOrdersStats = async () => {
  const totalOrders = await Order.countDocuments();
  const processing = await Order.countDocuments({
    orderStatus: "processing",
  });
  const delivered = await Order.countDocuments({
    orderStatus: "delivered",
  });
  const cancelled = await Order.countDocuments({
    orderStatus: "cancelled",
  });
  const inTransit = await Order.countDocuments({
    orderStatus: "in-transit",
  });
  const totalRevenue = await Order.aggregate([
    {
      $match: { paymentStatus: "paid" },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$transaction.totalAmount" },
      },
    },
  ]);
  return {
    totalOrders,
    processing,
    delivered,
    cancelled,
    inTransit,
    totalRevenue: totalRevenue[0]?.totalRevenue || 0,
  };
};

const queryOrders = async (
  filter: Record<string, any>,
  options: Record<string, any>,
) => {
  const finalFilter = { ...filter };
  if (finalFilter.referralPartner) {
    finalFilter["referralDetails.referralPartner"] =
      finalFilter.referralPartner;
    delete finalFilter.referralPartner;
  }

  const orders = await Order.find(finalFilter)
    .sort(options.sortBy || { createdAt: -1 })
    .skip(options.page ? (options.page - 1) * options.limit : 0)
    .limit(options.limit || Number.MAX_SAFE_INTEGER)
    .populate("customer", "firstName lastName email phoneNumber")
    .populate({
      path: "referralDetails.referralPartner",
      populate: {
        path: "user",
        select: "_id firstName lastName email phoneNumber",
      },
    });
  return orders;
};

const updateOrder = async (
  orderId: string,
  updateBody: Record<string, any>,
) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  // Update audit timestamps based on status change
  if (updateBody.orderStatus) {
    const now = new Date();
    if (updateBody.orderStatus === "processing")
      order.orderAudit!.processedAt = now;
    if (updateBody.orderStatus === "in-transit")
      order.orderAudit!.inTransitAt = now;
    if (updateBody.orderStatus === "cancelled")
      order.orderAudit!.cancelledAt = now;
    if (updateBody.orderStatus === "delivered")
      order.orderAudit!.deliveredAt = now;
  }

  // Update referral commission status and note if provided
  if (updateBody.referralCommissionStatus && order.referralDetails) {
    order.referralDetails.commission!.status =
      updateBody.referralCommissionStatus;
  }
  if (
    updateBody.referralCommissionNote !== undefined &&
    order.referralDetails
  ) {
    order.referralDetails.commission!.note = updateBody.referralCommissionNote;
  }

  // Remove commission fields from updateBody to avoid overwriting
  const {
    referralCommissionStatus,
    referralCommissionNote,
    ...restUpdateBody
  } = updateBody;

  Object.assign(order, restUpdateBody);
  await order.save();
  return order;
};

const getOrder = async (orderId: string) => {
  const order = await Order.findById(orderId)
    .populate("customer", "firstName lastName email phoneNumber")
    .populate({
      path: "referralDetails.referralPartner",
      populate: {
        path: "user",
        select: "_id firstName lastName email phoneNumber",
      },
    });
  return order;
};

const updateOrderProducts = async (
  orderId: string,
  products: { productId: string; quantity: number }[],
) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  }

  // Only allow product updates for processing orders
  if (order.orderStatus !== "processing") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Products can only be updated for orders in processing status",
    );
  }

  // Fetch all products
  const fetchedProducts = await Product.find({
    _id: { $in: products.map((item) => item.productId) },
  });

  if (fetchedProducts.length !== products.length) {
    throw new ApiError(httpStatus.NOT_FOUND, "Some products not found");
  }

  // Calculate new total
  const subTotal = products.reduce(
    (total, item) =>
      total +
      fetchedProducts.find(
        (product) => product._id.toString() === item.productId,
      )!.price *
        item.quantity,
    0,
  );

  // Normalize products
  const normalizedProducts = products.map((item) => {
    const thisProduct = fetchedProducts.find(
      (product) => product._id.toString() === item.productId,
    );
    return {
      productId: thisProduct?._id,
      productImage: thisProduct?.image,
      quantity: item.quantity,
      price: thisProduct?.price,
      amount: thisProduct!.price * item.quantity,
      productName: thisProduct?.name,
    };
  });

  // Update order
  order.products = normalizedProducts as any;
  order.transaction!.subTotal = subTotal;
  order.transaction!.totalAmount =
    subTotal + (order.transaction!.deliveryFee || 0);

  // Update referral commission if applicable
  if (order.referralDetails?.referralPartner) {
    const referralPartner = await referralPartnerService.getReferralPartner({
      _id: order.referralDetails.referralPartner,
    });

    if (referralPartner) {
      const commissionRate = referralPartner.commission!.rate;
      const newCommissionAmount =
        order.transaction!.totalAmount * (commissionRate / 100);

      order.referralDetails.commission!.amount = newCommissionAmount;
    }
  }

  await order.save();
  return order;
};

export default {
  createOrder,
  getPortalUserOrders,
  getOrder,
  queryOrders,
  updateOrder,
  getPortalUserRecentOrders,
  updateOrderProducts,
  getPortalUserOrdersStats,
  getGeneralOrdersStats,
};
