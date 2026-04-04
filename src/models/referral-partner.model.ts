import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import { generateReferralCode } from "@/utils/generate-referral-code.js";
import roles from "@/config/roles.js";

const referralPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Portal_User",
      required: true,
      unique: true,
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    profession: {
      type: String,
      enum: roles.normalizedReferralPartnerProfessions,
      default: "other",
    },
    commission: {
      rate: {
        type: Number,
        required: true,
        default: 1.5,
      },
      rateType: {
        type: String,
        enum: ["percentage", "fixed"],
        default: "percentage",
      },
    },
    accountDetails: {
      accountName: {
        type: String,
      },
      bankName: {
        type: String,
      },
      accountNumber: {
        type: String,
      },
      bankCode: {
        type: String,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

referralPartnerSchema.virtual("orders", {
  ref: "Order",
  localField: "_id",
  foreignField: "referralDetails.referralPartner",
});

referralPartnerSchema.virtual("referralsCount", {
  ref: "Portal_User",
  localField: "_id",
  foreignField: "referredBy",
  count: true,
});

referralPartnerSchema.virtual("commissionTotal").get(function (this: any) {
  if (!this.orders) return 0;
  return this.orders.reduce((total: number, order: any) => {
    return total + (order.referralDetails?.commission?.amount || 0);
  }, 0);
});

referralPartnerSchema.virtual("pendingCommissions").get(function (this: any) {
  if (!this.orders) return 0;
  return this.orders.reduce((total: number, order: any) => {
    if (order.referralDetails?.commission?.status === "pending") {
      return total + (order.referralDetails?.commission?.amount || 0);
    }
    return total;
  }, 0);
});

referralPartnerSchema.virtual("paidCommissions").get(function (this: any) {
  if (!this.orders) return 0;
  return this.orders.reduce((total: number, order: any) => {
    if (order.referralDetails?.commission?.status === "paid") {
      return total + (order.referralDetails?.commission?.amount || 0);
    }
    return total;
  }, 0);
});

referralPartnerSchema.pre("validate", async function () {
  if (!this.referralCode) {
    let isUnique = false;
    let code = "";

    while (!isUnique) {
      code = generateReferralCode(8);
      const existingPartner = await (
        this.constructor as mongoose.Model<ReferralPartnerType>
      ).findOne({
        referralCode: code,
      });
      if (!existingPartner) {
        isUnique = true;
      }
    }

    this.referralCode = code;
  }
});

export type ReferralPartnerType = InferSchemaType<typeof referralPartnerSchema>;
export type ReferralPartnerDoc = HydratedDocument<ReferralPartnerType>;

const ReferralPartner = mongoose.model(
  "Referral_Partner",
  referralPartnerSchema,
);

export default ReferralPartner;
