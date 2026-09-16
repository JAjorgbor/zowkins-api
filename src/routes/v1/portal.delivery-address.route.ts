import express from "express";
import validate from "@/middlewares/validate.js";
import portalAuth, { requireSelf } from "@/middlewares/portal-auth.js";
import deliveryAddressValidation from "@/validation/delivery-address.validation.js";
import deliveryAddressController from "@/controllers/delivery-address.controller.js";

const router = express.Router();

router
  .route("/:userId")
  .post(
    portalAuth(),
    requireSelf(),
    validate(deliveryAddressValidation.createDeliveryAddress),
    deliveryAddressController.createDeliveryAddress
  )
  .get(portalAuth(), requireSelf(), deliveryAddressController.getDeliveryAddresses);

router
  .route("/:userId/:addressId")
  .get(
    portalAuth(),
    requireSelf(),
    validate(deliveryAddressValidation.getDeliveryAddress),
    deliveryAddressController.getDeliveryAddress
  )
  .patch(
    portalAuth(),
    requireSelf(),
    validate(deliveryAddressValidation.updateDeliveryAddress),
    deliveryAddressController.updateDeliveryAddress
  )
  .delete(
    portalAuth(),
    requireSelf(),
    validate(deliveryAddressValidation.deleteDeliveryAddress),
    deliveryAddressController.deleteDeliveryAddress
  );

export default router;
