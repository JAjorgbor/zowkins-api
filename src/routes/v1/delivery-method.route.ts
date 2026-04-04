import express from "express";
import validate from "@/middlewares/validate.js";
import deliveryMethodValidation from "@/validation/delivery-method.validation.js";
import deliveryMethodController from "@/controllers/delivery-method.controller.js";

const router = express.Router();

router
  .route("/")
  .get(
    validate(deliveryMethodValidation.getDeliveryMethods),
    deliveryMethodController.getDeliveryMethods
  );

export default router;
