import httpStatus from "http-status";
import catchAsync from "@/utils/catch-async.js";
import referralPartnerService from "@/services/referral-partner.service.js";
import type { Request, Response } from "express";
import portalUserService from "@/services/portal.user.service.js";

const getReferralPartners = catchAsync(async (req: Request, res: Response) => {
  const result = await referralPartnerService.getReferralPartners();
  res.send({ partners: result });
});

const getReferralPartner = catchAsync(async (req: Request, res: Response) => {
  const result = await referralPartnerService.getReferralPartner({
    _id: req.params.partnerId,
  });
  res.send({ partner: result });
});

const addReferralPartner = catchAsync(async (req: Request, res: Response) => {
  const referralPartner = await referralPartnerService.addReferralPartner(
    req.body,
  );
  res.status(httpStatus.CREATED).send(referralPartner);
});

const updateReferralPartner = catchAsync(
  async (req: Request, res: Response) => {
    const result = await referralPartnerService.updateReferralPartner({
      _id: req.params.partnerId,
      ...req.body,
    });
    res.send({ partner: result });
  },
);

const togglePartnerStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await referralPartnerService.toggleReferralPartnerStatus(
    req.params.partnerId!,
  );
  res.send({ partner: result });
});

const deleteReferralPartner = catchAsync(
  async (req: Request, res: Response) => {
    await referralPartnerService.deleteReferralPartner({
      _id: req.params.partnerId!,
    });
    res.status(httpStatus.NO_CONTENT).send();
  },
);

const getReferralPartnerReferrals = catchAsync(
  async (req: Request, res: Response) => {
    const result = await portalUserService.getPortalUsers({
      referredBy: req.params.partnerId,
    });
    res.send({ referrals: result });
  },
);

const getTopReferralPartners = catchAsync(
  async (req: Request, res: Response) => {
    const result = await referralPartnerService.getTopReferralPartners();
    res.send({ partners: result });
  },
);

export default {
  getReferralPartners,
  getReferralPartner,
  addReferralPartner,
  updateReferralPartner,
  togglePartnerStatus,
  deleteReferralPartner,
  getReferralPartnerReferrals,
  getTopReferralPartners,
};
