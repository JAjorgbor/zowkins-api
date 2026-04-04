import express from "express";
import validate from "@/middlewares/validate.js";
import deliveryAddressValidation from "@/validation/delivery-address.validation.js";
import deliveryAddressController from "@/controllers/delivery-address.controller.js";

const router = express.Router();

router
  .route("/:userId")
  .post(
    validate(deliveryAddressValidation.createDeliveryAddress),
    deliveryAddressController.createDeliveryAddress
  )
  .get(deliveryAddressController.getDeliveryAddresses);

router
  .route("/:userId/:addressId")
  .get(
    validate(deliveryAddressValidation.getDeliveryAddress),
    deliveryAddressController.getDeliveryAddress
  )
  .patch(
    validate(deliveryAddressValidation.updateDeliveryAddress),
    deliveryAddressController.updateDeliveryAddress
  )
  .delete(
    validate(deliveryAddressValidation.deleteDeliveryAddress),
    deliveryAddressController.deleteDeliveryAddress
  );

export default router;
