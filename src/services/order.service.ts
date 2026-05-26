import Order from "@/models/order.model.js";
import adminTeamService from "@/services/admin.team.service.js";
import moment from "moment";
import Product from "@/models/product.model.js";
import deliveryAddressService from "@/services/delivery-address.service.js";
import deliveryMethodService from "@/services/delivery-method.service.js";
import emailService from "@/services/email.service.js";
import portalUserService from "@/services/portal.user.service.js";
import referralPartnerService from "@/services/referral-partner.service.js";
import ApiError from "@/utils/api-error.js";
import { handleAssetUpload } from "@/utils/upload-asset.js";
import customValidation from "@/validation/custom.validation.js";
import orderValidation from "@/validation/order.validation.js";
import type { Request } from "express";
import httpStatus from "http-status";
import { Types } from "mongoose";
import roles from "@/config/roles.js";
import paystack from "@/config/paystack.js";

const createOrder = async ({
  customer,
  items,
  deliveryAddress,
  deliveryMethod,
  callbackUrl,
  includePayment = false,
}: {
  customer: string;
  items: { productId: string; quantity: number }[];
  deliveryAddress: any;
  deliveryMethod: string;
  callbackUrl?: string;
  includePayment?: boolean;
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

  // const deliveryAddressDetails =
  //   await deliveryAddressService.getDeliveryAddressById(
  //     portalUser._id.toString(),
  //     deliveryAddress,
  //   );
  // if (!deliveryAddressDetails)
  //   throw new ApiError(httpStatus.NOT_FOUND, "Delivery Address not found");

  const deliveryMethodDetails = await deliveryMethodService.getDeliveryMethod({
    _id: deliveryMethod,
  });
  if (!deliveryMethodDetails)
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery Method not found");
  const fetchedProducts = await Product.find({
    _id: { $in: items.map((item) => item.productId) },
  });

  for (const item of items) {
    if (
      !fetchedProducts.find(
        (product) => product._id.toString() === item.productId,
      )
    ) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${item.productId}`,
      );
    }
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
      productImage: thisProduct?.images[0],
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
    deliveryAddress,
    referralDetails,
    transaction: {
      subTotal,
      totalAmount,
      deliveryFee: deliveryMethodDetails.fee,
    },
    deliveryMethod: deliveryMethodDetails,
  });

  await emailService.portalOrderConfirmation({
    toEmail: portalUser.email,
    createdAt: moment(order.createdAt).format("MMMM DD, YYYY"),
    deliveryAddress: `${deliveryAddress?.street}, ${deliveryAddress?.city}, ${deliveryAddress?.state}`,
    deliveryFee: deliveryMethodDetails.fee,
    subTotal,
    totalAmount,
    products: normalizedItems.map((each) => ({
      name: each.productName!,
      amount: each.amount!,
      quantity: each.quantity!,
    })),
    deliveryMethod: deliveryMethodDetails.name,
    orderNumber: order.orderNumber,
    firstName: portalUser.firstName,
  });

  const notifiedAdmins = await adminTeamService.getAdminUsers({
    role: roles.getAdminRolesWithPermission("manageOrders"),
  });
  if (notifiedAdmins.length) {
    await emailService.adminOrderNotification({
      toEmail: notifiedAdmins.map((admin) => admin.email as string),
      createdAt: moment(order.createdAt).format("MMMM DD, YYYY"),
      deliveryAddress: `${deliveryAddress?.street}, ${deliveryAddress?.city}, ${deliveryAddress?.state}`,
      customerPhone: portalUser.phoneNumber,
      customerEmail: portalUser.email,
      deliveryFee: deliveryMethodDetails.fee,
      subTotal,
      totalAmount,
      products: normalizedItems.map((each) => ({
        name: each.productName!,
        amount: each.amount!,
        quantity: each.quantity!,
      })),
      deliveryMethod: deliveryMethodDetails.name,
      orderNumber: order.orderNumber,
      customerName: `${portalUser.firstName} ${portalUser.lastName}`,
    });
  }

  let paymentLink;
  if (includePayment) {
    paymentLink = await generatePaymentLink(order._id.toString(), callbackUrl!);
  }

  return {
    order,
    paymentLink,
  };
};
const requestOrderQuote = async (req: Request) => {
  const _id = new Types.ObjectId();

  const { file, fields } = await handleAssetUpload(
    req,
    `orders/quotes/${_id}`,
    {
      fields: orderValidation.requestOrderQuote,
      file: customValidation.fileSchema,
      requireFile: false,
    },
  );

  const { customer, items = [], deliveryAddress, note } = fields;
  const portalUser = await portalUserService.createPortalUser(customer);
  if (!portalUser?._id)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create or retrieve portal user",
    );

  const order = await Order.create({
    _id,
    customer: portalUser._id.toString(),
    quoteDetails: { items, note: note || "", file },
    deliveryAddress,
    transaction: {
      totalAmount: 0,
    },
  });

  await emailService.portalOrderQuote({
    toEmail: portalUser.email,
    createdAt: moment(order.createdAt).format("MMMM DD, YYYY"),
    deliveryAddress: `${deliveryAddress?.street}, ${deliveryAddress?.city}, ${deliveryAddress?.state}`,
    products: items.map((each: any) => ({
      name: each.name,
      quantity: each.quantity,
    })),
    note,
    orderNumber: order.orderNumber,
    firstName: portalUser.firstName,
    fileUrl: file?.url!,
  });

  const notifiedAdmins = await adminTeamService.getAdminUsers({
    role: roles.getAdminRolesWithPermission("manageOrders"),
  });
  if (notifiedAdmins.length) {
    await emailService.adminOrderQuoteRequest({
      toEmail: notifiedAdmins.map((admin) => admin.email as string),
      createdAt: moment(order.createdAt).format("MMMM DD, YYYY"),
      deliveryAddress: `${deliveryAddress?.street}, ${deliveryAddress?.city}, ${deliveryAddress?.state}`,
      products: items.map((each: any) => ({
        name: each.name,
        quantity: each.quantity,
      })),
      note,
      orderNumber: order.orderNumber,
      customerName: `${portalUser.firstName} ${portalUser.lastName}`,
      customerPhone: portalUser.phoneNumber,
      customerEmail: portalUser.email,
      fileUrl: file?.url!,
    });
  }
  return order;
};

const generatePaymentLink = async (orderId: string, callbackUrl: string) => {
  const order = await getOrder(orderId);
  if (!order) throw new ApiError(httpStatus.NOT_FOUND, "Order not found");
  if (!callbackUrl)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "callbackUrl is required when generating paymentLink",
    );
  const { transaction, customer } = order;

  const portalUser = await portalUserService.getPortalUser({
    _id: customer.toString(),
  });

  const initializePaymentResponse = await paystack.initializeTransaction({
    amount: transaction?.totalAmount!,
    email: portalUser?.email!,
    callbackUrl: callbackUrl!,
    metadata: {
      orderId: order._id.toString(),
      type: "order",
    },
  });
  order.transaction!.ref = initializePaymentResponse.reference;
  await order.save();
  return initializePaymentResponse.authorization_url;
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

  const {
    referralCommissionStatus,
    referralCommissionNote,
    ...restUpdateBody
  } = updateBody;

  const previousOrderStatus = order.orderStatus;
  const previousPaymentStatus = order.paymentStatus;

  Object.assign(order, restUpdateBody);
  await order.save();

  const portalUser = await portalUserService.getPortalUser({
    _id: order.customer as any,
  });
  if (portalUser) {
    if (
      updateBody.orderStatus &&
      updateBody.orderStatus !== previousOrderStatus
    ) {
      if (updateBody.orderStatus === "cancelled") {
        await emailService.portalOrderCancelled({
          toEmail: portalUser.email,
          firstName: portalUser.firstName,
          orderNumber: order.orderNumber,
        });
      } else if (updateBody.orderStatus === "delivered") {
        await emailService.portalOrderDelivered({
          toEmail: portalUser.email,
          firstName: portalUser.firstName,
          orderNumber: order.orderNumber,
          products: order.products.map((each: any) => ({
            name: each.productName,
            amount: each.amount,
            quantity: each.quantity,
          })),
        });
      }
    }

    if (
      updateBody.paymentStatus &&
      updateBody.paymentStatus !== previousPaymentStatus
    ) {
      if (updateBody.paymentStatus === "paid") {
        await emailService.potalOrderPaymentConfirmed({
          toEmail: portalUser.email,
          firstName: portalUser.firstName,
          orderNumber: order.orderNumber,
          createdAt: moment(order.createdAt).format("MMMM DD, YYYY"),
          totalAmount: order.transaction!.totalAmount,
        });

        const notifiedAdmins = await adminTeamService.getAdminUsers({
          role: roles.getAdminRolesWithPermission("manageOrders"),
        });
        if (notifiedAdmins.length) {
          await emailService.adminOrderPaymentConfirmed({
            toEmail: notifiedAdmins.map((admin) => admin.email as string),
            customerName: portalUser.firstName + " " + portalUser.lastName,
            orderNumber: order.orderNumber,
            createdAt: moment(order.createdAt).format("MMMM DD, YYYY"),
            totalAmount: order.transaction!.totalAmount,
          });
        }
      }
    }
  }

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

  for (const item of products) {
    if (
      !fetchedProducts.find(
        (product) => product._id.toString() === item.productId,
      )
    ) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        `Product not found: ${item.productId}`,
      );
    }
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
      productImage: thisProduct?.images[0],
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
  requestOrderQuote,
  generatePaymentLink,
};
