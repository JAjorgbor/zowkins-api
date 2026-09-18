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
    // Same rules as the Portal_User model, checked up front because the account
    // is only created after the email is verified
    password: customValidation
      .required(z.string().min(8, "Password must be at least 8 characters"))
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/\d/, "Password must contain at least one number"),
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

const verificationToken = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "Invalid verification token");

const verifyEmail = {
  body: z.object({
    verificationToken,
    otp: z.string().regex(/^\d{6}$/, "The code must be 6 digits"),
  }),
};

const resendOtp = {
  body: z.object({
    verificationToken,
  }),
};

export default {
  createAccount,
  verifyEmail,
  resendOtp,
  login,
  resetPassword,
  setNewPassword,
};
