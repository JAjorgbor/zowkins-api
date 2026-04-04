import DeliveryAddress from "@/models/delivery-address.model.js";
import PortalUser from "@/models/portal.user.model.js";
import type { DeliveryAddressType } from "@/models/delivery-address.model.js";
import mongoose from "mongoose";
import httpStatus from "http-status";
import ApiError from "@/utils/api-error.js";

/**
 * Create a delivery address
 * @param {string} userId
 * @param {Partial<DeliveryAddressType>} addressBody
 * @returns {Promise<DeliveryAddressType>}
 */
const createDeliveryAddress = async (
  userId: string,
  addressBody: Partial<DeliveryAddressType>,
) => {
  const address = await DeliveryAddress.create(addressBody);
  await PortalUser.findByIdAndUpdate(userId, {
    $push: { deliveryAddresses: address._id },
  });
  return address;
};

/**
 * Get all delivery addresses for a user
 * @param {string} userId
 * @returns {Promise<DeliveryAddressType[]>}
 */
const getDeliveryAddresses = async (userId: string) => {
  const user = await PortalUser.findById(userId).populate("deliveryAddresses");
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  return user.deliveryAddresses;
};

/**
 * Get delivery address by id
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<DeliveryAddressType>}
 */
const getDeliveryAddressById = async (userId: string, addressId: string) => {
  const user = await PortalUser.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // CASTING: Check if the addressId exists in the user's deliveryAddresses list
  // Note: user.deliveryAddresses contains ObjectIds if not populated, or docs if populated.
  // We assume here we need to verify ownership.
  const hasAddress = user.deliveryAddresses.some(
    (id) => id.toString() === addressId,
  );

  if (!hasAddress) {
    throw new ApiError(httpStatus.FORBIDDEN, "Address not found for this user");
  }

  const address = await DeliveryAddress.findById(addressId);
  if (!address) {
    throw new ApiError(httpStatus.NOT_FOUND, "Address not found");
  }
  return address;
};

/**
 * Update delivery address
 * @param {string} userId
 * @param {string} addressId
 * @param {Object} updateBody
 * @returns {Promise<DeliveryAddressType>}
 */
const updateDeliveryAddress = async (
  userId: string,
  addressId: string,
  updateBody: Partial<DeliveryAddressType>,
) => {
  const address = await getDeliveryAddressById(userId, addressId);
  Object.assign(address, updateBody);
  await address.save();
  return address;
};

/**
 * Delete delivery address
 * @param {string} userId
 * @param {string} addressId
 * @returns {Promise<void>}
 */
const deleteDeliveryAddress = async (userId: string, addressId: string) => {
  const address = await getDeliveryAddressById(userId, addressId);
  await address.deleteOne();
  await PortalUser.findByIdAndUpdate(userId, {
    $pull: { deliveryAddresses: addressId },
  });
};

export default {
  createDeliveryAddress,
  getDeliveryAddresses,
  getDeliveryAddressById,
  updateDeliveryAddress,
  deleteDeliveryAddress,
};
