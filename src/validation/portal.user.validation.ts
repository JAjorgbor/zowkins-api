import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";

const updatePortalUserPassword = {
  body: z.object({
    currentPassword: customValidation.required(
      z.string(),
      "Current password is required",
    ),
    newPassword: customValidation.required(
      z.string().min(6),
      "New password must be at least 6 characters",
    ),
  }),
};

const upatePortalUser = {
  body: z.object({
    firstName: customValidation.required(z.string(), "First name is required"),
    lastName: customValidation.required(z.string(), "Last name is required"),
    phoneNumber: customValidation.required(
      z.string(),
      "WhatsApp phone number is required",
    ),
    gender: z.enum(["male", "female"]).optional(),
    dateOfBirth: z.string().optional(),
  }),
};

export default { updatePortalUserPassword, upatePortalUser };
