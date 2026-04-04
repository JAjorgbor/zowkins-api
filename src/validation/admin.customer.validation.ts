import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";

const getCustomers = {
  query: z.object({
    status: z.enum(["pending", "active", "inactive", "waitlist"]).optional(),
    isReferralPartner: z.string().optional(), // boolean string
  }),
};

const getCustomer = {
  params: z.object({
    userId: customValidation.required(z.string(), "User ID is required"),
  }),
};

const updateCustomer = {
  params: z.object({
    userId: customValidation.required(z.string(), "User ID is required"),
  }),
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    status: z.enum(["pending", "active", "inactive", "waitlist"]).optional(),
    isReferralPartner: z.boolean().optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().optional(),
  }),
};

const deleteCustomer = {
  params: z.object({
    userId: customValidation.required(z.string(), "User ID is required"),
  }),
};

const getNonReferralPartners = {
  query: z.object({
    search: z.string().optional(),
  }),
};

export default {
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getNonReferralPartners,
};
