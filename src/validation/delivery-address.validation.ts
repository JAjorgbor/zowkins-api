import { z } from "zod";

const createDeliveryAddress = {
  params: z.object({
    userId: z.string(),
  }),
  body: z.object({
    label: z.string().min(1),
    phoneNumber: z.string().min(9),
    street: z.string().min(3),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().default("Nigeria"),
    postalCode: z.string().optional(),
  }),
};

const updateDeliveryAddress = {
  params: z.object({
    userId: z.string(),
    addressId: z.string(),
  }),
  body: z.object({
    label: z.string().min(1).optional(),
    phoneNumber: z.string().min(9).optional(),
    street: z.string().min(3).optional(),
    city: z.string().min(2).optional(),
    state: z.string().min(2).optional(),
    country: z.string().optional(),
    postalCode: z.string().optional(),
  }),
};

const getDeliveryAddress = {
  params: z.object({
    userId: z.string(),
    addressId: z.string(),
  }),
};

const deleteDeliveryAddress = {
  params: z.object({
    userId: z.string(),
    addressId: z.string(),
  }),
};

export default {
  createDeliveryAddress,
  updateDeliveryAddress,
  getDeliveryAddress,
  deleteDeliveryAddress,
};
