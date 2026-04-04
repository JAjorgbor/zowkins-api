import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";

const createAccount = {
  body: z.object({
    firstName: customValidation.required(z.string(), "First name is required"),
    lastName: customValidation.required(z.string(), "Last name is required"),
    gender: z.enum(["male", "female"]).optional(),
    email: customValidation.email,
    phoneNumber: customValidation.required(
      z.string(),
      "Phone number is required",
    ),
    password: customValidation.required(z.string().min(8)),
    dateOfBirth: z.string().optional(),
    referralCode: z.string().optional(),
  }),
};

const login = {
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
  createAccount,
  login,
  resetPassword,
  setNewPassword,
};
