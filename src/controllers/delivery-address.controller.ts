import httpStatus from "http-status";
import catchAsync from "@/utils/catch-async.js";
import deliveryAddressService from "@/services/delivery-address.service.js";
import { type Request, type Response } from "express";

const createDeliveryAddress = catchAsync(
  async (req: Request, res: Response) => {
    const address = await deliveryAddressService.createDeliveryAddress(
      req.params.userId!,
      req.body
    );
    res.status(httpStatus.CREATED).send(address);
  }
);

const getDeliveryAddresses = catchAsync(async (req: Request, res: Response) => {
  const addresses = await deliveryAddressService.getDeliveryAddresses(
    req.params.userId!
  );
  res.send(addresses);
});

const getDeliveryAddress = catchAsync(async (req: Request, res: Response) => {
  const address = await deliveryAddressService.getDeliveryAddressById(
    req.params.userId!,
    req.params.addressId!
  );
  res.send(address);
});

const updateDeliveryAddress = catchAsync(
  async (req: Request, res: Response) => {
    const address = await deliveryAddressService.updateDeliveryAddress(
      req.params.userId!,
      req.params.addressId!,
      req.body
    );
    res.send(address);
  }
);

const deleteDeliveryAddress = catchAsync(
  async (req: Request, res: Response) => {
    await deliveryAddressService.deleteDeliveryAddress(
      req.params.userId!,
      req.params.addressId!
    );
    res.status(httpStatus.NO_CONTENT).send();
  }
);

export default {
  createDeliveryAddress,
  getDeliveryAddresses,
  getDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
};
