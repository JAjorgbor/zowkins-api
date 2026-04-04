import { z } from "zod";
import customValidation from "@/validation/custom.validation.js";

const getReferralPartner = {
  params: z.object({
    partnerId: customValidation.required(z.string(), "Partner ID is required"),
  }),
};

const addReferralPartner = {
  body: z.object({
    user: customValidation.required(z.string(), "User ID is required"),
    commissionRate: customValidation.required(
      z.number().min(0),
      "Commission rate is required",
    ),
    profession: customValidation.required(
      z.enum([
        "doctor",
        "nurse",
        "pharmacist",
        "chemist",
        "lab technician",
        "other",
      ]),
      "Profession is required",
    ),
    accountDetails: z.object({
      accountName: customValidation.required(
        z.string(),
        "Account name is required",
      ),
      bankName: customValidation.required(z.string(), "Bank name is required"),
      accountNumber: customValidation.required(
        z.string(),
        "Account number is required",
      ),
      bankCode: customValidation.required(z.string(), "Bank code is required"),
    }),
  }),
};

const updateReferralPartner = {
  params: z.object({
    partnerId: customValidation.required(z.string(), "Partner ID is required"),
  }),
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

const togglePartnerStatus = {
  params: z.object({
    partnerId: customValidation.required(z.string(), "Partner ID is required"),
  }),
};

const deleteReferralPartner = {
  params: z.object({
    partnerId: customValidation.required(z.string(), "Partner ID is required"),
  }),
};

export default {
  getReferralPartner,
  addReferralPartner,
  updateReferralPartner,
  togglePartnerStatus,
  deleteReferralPartner,
};
