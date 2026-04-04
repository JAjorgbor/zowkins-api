import express, { Router } from "express";
import auth from "@/middlewares/admin-auth.js";
import validate from "@/middlewares/validate.js";
import adminReferralPartnerController from "@/controllers/admin.referral-partner.controller.js";
import adminReferralPartnerValidation from "@/validation/admin.referral-partner.validation.js";

const router: Router = express.Router();

router
  .route("/")
  .get(
    auth("getReferralPartners"),
    adminReferralPartnerController.getReferralPartners,
  )
  .post(
    auth("manageReferralPartners"),
    validate(adminReferralPartnerValidation.addReferralPartner),
    adminReferralPartnerController.addReferralPartner,
  );

router.get(
  "/top",
  auth("getReferralPartners"),
  adminReferralPartnerController.getTopReferralPartners,
);

router
  .route("/:partnerId")
  .patch(
    auth("manageReferralPartners"),
    validate(adminReferralPartnerValidation.updateReferralPartner),
    adminReferralPartnerController.updateReferralPartner,
  )
  .delete(
    auth("manageReferralPartners"),
    validate(adminReferralPartnerValidation.deleteReferralPartner),
    adminReferralPartnerController.deleteReferralPartner,
  )
  .get(
    auth("getReferralPartners"),
    validate(adminReferralPartnerValidation.getReferralPartner),
    adminReferralPartnerController.getReferralPartner,
  );

router.get(
  "/referrals/:partnerId",
  auth("getReferralPartners"),
  validate(adminReferralPartnerValidation.getReferralPartner),
  adminReferralPartnerController.getReferralPartnerReferrals,
);

router.patch(
  "/toggle-status/:partnerId",
  auth("manageReferralPartners"),
  validate(adminReferralPartnerValidation.togglePartnerStatus),
  adminReferralPartnerController.togglePartnerStatus,
);

export default router;
