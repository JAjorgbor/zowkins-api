import httpStatus from "http-status";
import catchAsync from "@/utils/catch-async.js";
import deliveryMethodService from "@/services/delivery-method.service.js";
import pick from "@/utils/pick.js";
import ApiError from "@/utils/api-error.js";
import { type Request, type Response } from "express";

const createDeliveryMethod = catchAsync(async (req: Request, res: Response) => {
  const deliveryMethod = await deliveryMethodService.createDeliveryMethod(
    req.body
  );
  res.status(httpStatus.CREATED).send(deliveryMethod);
});

const getDeliveryMethods = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ["name", "isActive", "visibility"]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await deliveryMethodService.queryDeliveryMethods(
    filter,
    options
  );
  res.send(result);
});

const getDeliveryMethod = catchAsync(async (req: Request, res: Response) => {
  const deliveryMethod = await deliveryMethodService.getDeliveryMethod({
    _id: req.params.deliveryMethodId,
  });
  if (!deliveryMethod) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery method not found");
  }
  res.send(deliveryMethod);
});

const updateDeliveryMethod = catchAsync(async (req: Request, res: Response) => {
  const deliveryMethod = await deliveryMethodService.updateDeliveryMethod(
    { _id: req.params.deliveryMethodId },
    req.body
  );
  res.send(deliveryMethod);
});

const deleteDeliveryMethod = catchAsync(async (req: Request, res: Response) => {
  await deliveryMethodService.deleteDeliveryMethod({
    _id: req.params.deliveryMethodId,
  });
  res.status(httpStatus.NO_CONTENT).send();
});

export default {
  createDeliveryMethod,
  getDeliveryMethods,
  getDeliveryMethod,
  updateDeliveryMethod,
  deleteDeliveryMethod,
};
