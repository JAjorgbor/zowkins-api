import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";
import roles from "@/config/roles.js";

const createAccountWithCredentials = {
  body: z.object({
    firstName: customValidation.required(z.string(), "First name is required"),
    lastName: customValidation.required(z.string(), "Last name is required"),
    status: customValidation.required(
      z.enum(["active", "inactive"]),
      "Status is required",
    ),
    role: customValidation.required(
      z.enum(roles.adminUserRoleOptions),
      "Role is required",
    ),
    gender: customValidation.required(
      z.enum(["Male", "Female"]),
      "Gender is required",
    ),
    email: customValidation.email,
    password: customValidation.required(z.string().min(6)),
    phoneNumber: z.string().optional(),
  }),
};

const loginWithCredentials = {
  body: z.object({
    email: customValidation.email,
    password: customValidation.required(z.string().min(6)),
  }),
};

const resetPassword = {
  body: z.object({
    email: customValidation.email,
  }),
};

const setNewPassword = {
  body: z.object({
    password: customValidation.required(z.string().min(6)),
  }),
  param: z.object({
    token: customValidation.required(z.string(), "Token is required"),
  }),
};

export default {
  createAccountWithCredentials,
  loginWithCredentials,
  resetPassword,
  setNewPassword,
};
