import { z } from "zod";

const createDeliveryMethod = {
  body: z.object({
    name: z.string().min(1),
    fee: z.number().nonnegative(),
    estimatedDeliveryTime: z.string().min(1),
    isActive: z.boolean().optional(),
    visibility: z.boolean().optional(),
  }),
};

const getDeliveryMethods = {
  query: z.object({
    name: z.string().optional(),
    isActive: z.string().optional(), // boolean-ish string from query
    visibility: z.string().optional(),
    sortBy: z.string().optional(),
    limit: z.number().int().optional(),
    page: z.number().int().optional(),
  }),
};

const getDeliveryMethod = {
  params: z.object({
    deliveryMethodId: z.string(),
  }),
};

const updateDeliveryMethod = {
  params: z.object({
    deliveryMethodId: z.string(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    fee: z.number().nonnegative().optional(),
    estimatedDeliveryTime: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    visibility: z.boolean().optional(),
  }),
};

const deleteDeliveryMethod = {
  params: z.object({
    deliveryMethodId: z.string(),
  }),
};

export default {
  createDeliveryMethod,
  getDeliveryMethods,
  getDeliveryMethod,
  updateDeliveryMethod,
  deleteDeliveryMethod,
};
