import DeliveryMethod from "@/models/delivery-method.model.js";
import httpStatus from "http-status";
import ApiError from "@/utils/api-error.js";

/**
 * Create a delivery method
 * @param {Object} deliveryMethodBody
 * @returns {Promise<Object>}
 */
const createDeliveryMethod = async (
  deliveryMethodBody: Record<string, any>
) => {
  if (await DeliveryMethod.findOne({ name: deliveryMethodBody.name })) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Delivery method already exists"
    );
  }
  return DeliveryMethod.create(deliveryMethodBody);
};

/**
 * Query for delivery methods
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryDeliveryMethods = async (
  filter: Record<string, any>,
  options: Record<string, any>
) => {
  const deliveryMethods = await DeliveryMethod.find(filter);
  return deliveryMethods;
};

/**
 * Get delivery method by filter
 * @param {Object} filter
 * @returns {Promise<Object>}
 */
const getDeliveryMethod = async (filter: Record<string, any>) => {
  return DeliveryMethod.findOne(filter);
};

/**
 * Update delivery method by filter
 * @param {Object} filter
 * @param {Object} updateBody
 * @returns {Promise<Object>}
 */
const updateDeliveryMethod = async (
  filter: Record<string, any>,
  updateBody: Record<string, any>
) => {
  const deliveryMethod = await getDeliveryMethod(filter);
  if (!deliveryMethod) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery method not found");
  }
  if (
    updateBody.name &&
    (await DeliveryMethod.findOne({
      name: updateBody.name,
      _id: { $ne: deliveryMethod._id },
    }))
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Delivery method name already taken"
    );
  }
  Object.assign(deliveryMethod, updateBody);
  await deliveryMethod.save();
  return deliveryMethod;
};

/**
 * Delete delivery method by filter
 * @param {Object} filter
 * @returns {Promise<Object>}
 */
const deleteDeliveryMethod = async (filter: Record<string, any>) => {
  const deliveryMethod = await getDeliveryMethod(filter);
  if (!deliveryMethod) {
    throw new ApiError(httpStatus.NOT_FOUND, "Delivery method not found");
  }
  await deliveryMethod.deleteOne();
  return deliveryMethod;
};

export default {
  createDeliveryMethod,
  queryDeliveryMethods,
  getDeliveryMethod,
  updateDeliveryMethod,
  deleteDeliveryMethod,
};
