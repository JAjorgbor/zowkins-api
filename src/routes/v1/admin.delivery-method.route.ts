import express from "express";
import auth from "@/middlewares/admin-auth.js";
import validate from "@/middlewares/validate.js";
import deliveryMethodValidation from "@/validation/delivery-method.validation.js";
import deliveryMethodController from "@/controllers/delivery-method.controller.js";

const router = express.Router();

router
  .route("/")
  .post(
    auth("manageOrders"),
    validate(deliveryMethodValidation.createDeliveryMethod),
    deliveryMethodController.createDeliveryMethod
  )
  .get(
    auth("getOrders"),
    validate(deliveryMethodValidation.getDeliveryMethods),
    deliveryMethodController.getDeliveryMethods
  );

router
  .route("/:deliveryMethodId")
  .get(
    auth("getOrders"),
    validate(deliveryMethodValidation.getDeliveryMethod),
    deliveryMethodController.getDeliveryMethod
  )
  .patch(
    auth("manageOrders"),
    validate(deliveryMethodValidation.updateDeliveryMethod),
    deliveryMethodController.updateDeliveryMethod
  )
  .delete(
    auth("manageOrders"),
    validate(deliveryMethodValidation.deleteDeliveryMethod),
    deliveryMethodController.deleteDeliveryMethod
  );

export default router;
