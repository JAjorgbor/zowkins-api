import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";

const updateReferralPartner = {
  body: z.object({
    commissionRate: z.number().min(0).optional(),
    profession: z
      .enum([
        "doctor",
        "nurse",
        "pharmacist",
        "chemist",
        "lab technician",
        "other",
      ])
      .optional(),
    accountDetails: z
      .object({
        accountName: customValidation.required(
          z.string(),
          "Account name is required",
        ),
        bankName: customValidation.required(
          z.string(),
          "Bank name is required",
        ),
        accountNumber: customValidation.required(
          z.string(),
          "Account number is required",
        ),
        bankCode: customValidation.required(
          z.string(),
          "Bank code is required",
        ),
      })
      .optional(),
  }),
};

export default { updateReferralPartner };
