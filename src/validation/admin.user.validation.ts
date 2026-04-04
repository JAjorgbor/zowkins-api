import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";

const getAdminUser = {
  params: z.object({
    id: customValidation.required(z.string(), "Admin user ID is required"),
  }),
};

const updateAdminUserPassword = {
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

const updateAdminUser = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

export default {
  getAdminUser,
  updateAdminUserPassword,
  updateAdminUser,
};
