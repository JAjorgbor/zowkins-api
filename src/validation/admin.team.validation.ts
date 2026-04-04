import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";
import roles from "@/config/roles.js";

const adminUserInvite = {
  body: z.object({
    firstName: customValidation.required(z.string(), "First name is required"),
    lastName: customValidation.required(z.string(), "Last name is required"),
    email: customValidation.email,
    role: customValidation.required(
      z.enum(roles.adminUserRoleOptions),
      "Role is required"
    ),
    gender: customValidation.required(
      z.enum(["Male", "Female"]),
      "Gender is required"
    ),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
  }),
};

const acceptInvite = {
  params: z.object({
    token: customValidation.required(z.string(), "Token is required"),
  }),
  body: z.object({
    password: customValidation.required(z.string().min(6)),
  }),
};

const resendAdminUserInvite = {
  params: z.object({
    id: customValidation.required(z.string(), "Admin user ID is required"),
  }),
};

const updateAdminUser = {
  params: z.object({
    id: customValidation.required(z.string(), "Admin user ID is required"),
  }),
  body: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    role: z.enum(roles.adminUserRoleOptions).optional(),
    status: z.enum(["pending", "active", "inactive"]).optional(),
    gender: z.enum(["Male", "Female"]).optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
  }),
};

const removeAdminUser = {
  params: z.object({
    id: customValidation.required(z.string(), "Admin user ID is required"),
  }),
};

export default {
  adminUserInvite,
  acceptInvite,
  resendAdminUserInvite,
  updateAdminUser,
  removeAdminUser,
};
