import express, { Router } from "express";
import portalAuth from "@/middlewares/portal-auth.js";
import validate from "@/middlewares/validate.js";
import portalReferralPartnerController from "@/controllers/portal.referral-partner.controller.js";
import portalReferralPartnerValidation from "@/validation/portal.referral-partner.validation.js";

const router: Router = express.Router();

router
  .route("/me")
  .get(
    portalAuth("referralPartner"),
    portalReferralPartnerController.getReferralPartnerDetails,
  )
  .patch(
    portalAuth("referralPartner"),
    validate(portalReferralPartnerValidation.updateReferralPartner),
    portalReferralPartnerController.updateReferralPartnerDetails,
  );

router.get(
  "/me/referrals",
  portalAuth("referralPartner"),
  portalReferralPartnerController.getReferrals,
);

router.get(
  "/me/referrals/:userId",
  portalAuth("referralPartner"),
  portalReferralPartnerController.getReferredUserDetails,
);

router.get(
  "/me/referrals/:userId/orders",
  portalAuth("referralPartner"),
  portalReferralPartnerController.getReferredUserOrders,
);

router.get(
  "/me/referrals/:userId/orders/:orderId",
  portalAuth("referralPartner"),
  portalReferralPartnerController.getReferredUserOrder,
);

export default router;
