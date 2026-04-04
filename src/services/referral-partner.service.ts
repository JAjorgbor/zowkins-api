import mongoose, { type PipelineStage } from "mongoose";
import ReferralPartner from "@/models/referral-partner.model.js";
import PortalUser from "@/models/portal.user.model.js";
import portalUserService from "@/services/portal.user.service.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";
import emailService from "@/services/email.service.js";
import roles from "@/config/roles.js";

const getReferralPartner = async (filterOptions: Object) => {
  const referralPartner = await ReferralPartner.findOne(filterOptions)
    .populate("user")
    .populate("orders")
    .populate("referralsCount");
  if (!referralPartner)
    throw new ApiError(httpStatus.NOT_FOUND, "Referral Partner not found");
  return referralPartner;
};

const getReferralPartners = async () => {
  const referralPartners = await ReferralPartner.find()
    .populate("user")
    .populate("orders")
    .populate("referralsCount");
  return referralPartners;
};

const addReferralPartner = async ({
  user,
  commissionRate,
  profession,
  accountDetails,
}: {
  user: string;
  commissionRate: number;
  profession: string;
  accountDetails: {
    accountName: string;
    bankName: string;
    accountNumber: string;
    bankCode: string;
  };
}) => {
  const portalUser = await portalUserService.getPortalUser({ _id: user });
  if (!portalUser)
    throw new ApiError(httpStatus.NOT_FOUND, "Portal User not found");

  if (portalUser.isReferralPartner) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "User is already a referral partner",
    );
  }

  const referralPartner = await ReferralPartner.create({
    user,
    commission: { rate: commissionRate },
    profession,
    accountDetails,
  });
  portalUser.isReferralPartner = true;
  await portalUser.save();
  await emailService.notifyAddedReferralPartner({
    toEmail: portalUser.email,
    firstName: portalUser.firstName,
    professionalTitle:
      roles.referralPartnerProfessions[
        profession as keyof typeof roles.referralPartnerProfessions
      ],
  });
  return referralPartner;
};

const updateReferralPartner = async ({
  _id,
  commissionRate,
  profession,
  accountDetails,
}: {
  _id: string;
  commissionRate?: number;
  profession?:
    | "doctor"
    | "nurse"
    | "pharmacist"
    | "chemist"
    | "lab technician"
    | "other";
  accountDetails?: {
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    bankCode?: string;
  };
}) => {
  const referralPartner = await ReferralPartner.findOne({
    _id,
  });

  if (!referralPartner)
    throw new ApiError(httpStatus.NOT_FOUND, "Referral Partner not found");

  if (commissionRate) referralPartner.commission!.rate = commissionRate;
  if (profession) referralPartner.profession = profession;
  if (accountDetails) {
    referralPartner.accountDetails = {
      ...referralPartner.accountDetails,
      ...accountDetails,
    };
  }

  return referralPartner.save();
};

const toggleReferralPartnerStatus = async (partnerId: string) => {
  const referralPartner = await ReferralPartner.findOne({
    _id: partnerId,
  });

  if (!referralPartner)
    throw new ApiError(httpStatus.NOT_FOUND, "Referral Partner not found");

  referralPartner.status =
    referralPartner.status === "active" ? "inactive" : "active";
  return referralPartner.save();
};

const deleteReferralPartner = async ({ _id }: { _id: string }) => {
  const referralPartner = await ReferralPartner.findOneAndDelete({
    _id,
  });
  if (!referralPartner)
    throw new ApiError(httpStatus.NOT_FOUND, "Referral Partner not found");
  const portalUser = await portalUserService.getPortalUser({
    _id: referralPartner.user.toString(),
  });
  if (portalUser) {
    portalUser.isReferralPartner = false;
    await portalUser.save();
  }

  return referralPartner;
};

const getReferredUsers = async (partnerId: string) => {
  return await await portalUserService.getPortalUsers({
    referredBy: partnerId,
  });
};

const getTopReferralPartners = async () => {
  const pipeline: PipelineStage[] = [
    // Optional: only active partners
    { $match: { status: "active" } },

    // 1) Count referrals (Portal_User where referredBy = this partner _id)
    {
      $lookup: {
        from: "portal_users", // <-- confirm actual name (see note below)
        let: { partnerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$referredBy", "$$partnerId"] },
            },
          },
          { $count: "count" },
        ],
        as: "referralsMeta",
      },
    },
    {
      $addFields: {
        referralsCount: { $ifNull: [{ $first: "$referralsMeta.count" }, 0] },
      },
    },

    // 2) Sum total earned from Orders for this partner
    {
      $lookup: {
        from: "orders", // <-- confirm actual name
        let: { partnerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$referralDetails.referralPartner", "$$partnerId"],
              },
              // common filters:
              // if you only want orders that have been paid for, uncomment:
              // paymentStatus: "paid",
              // if you only want commissions actually paid out, uncomment:
              // "referralDetails.commission.status": "paid",
            },
          },
          {
            $group: {
              _id: null,
              commissionTotal: { $sum: "$referralDetails.commission.amount" },
              orders: { $sum: 1 },
            },
          },
        ],
        as: "earningsMeta",
      },
    },
    {
      $addFields: {
        commissionTotal: {
          $ifNull: [{ $first: "$earningsMeta.commissionTotal" }, 0],
        },
        ordersAttributed: {
          $ifNull: [{ $first: "$earningsMeta.ordersAttributed" }, 0],
        },
      },
    },

    // 3) Join the partner’s user profile (name/email) if you want it in the output
    {
      $lookup: {
        from: "portal_users", // <-- same note
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

    // Clean up helper arrays + shape output
    {
      $project: {
        referralsMeta: 0,
        earningsMeta: 0,
        "user.security": 0, // just in case
      },
    },

    // 4) Rank
    { $sort: { referralsCount: -1, commissionTotal: -1, createdAt: 1 } },
    { $limit: 10 },
  ];

  const leaderboard = await ReferralPartner.aggregate(pipeline);
  return leaderboard;
};

export default {
  getReferralPartner,
  getReferralPartners,
  addReferralPartner,
  updateReferralPartner,
  toggleReferralPartnerStatus,
  deleteReferralPartner,
  getReferredUsers,
  getTopReferralPartners,
};
