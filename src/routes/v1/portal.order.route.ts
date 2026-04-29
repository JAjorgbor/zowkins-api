import express from "express";
import validate from "@/middlewares/validate.js";
import orderValidation from "@/validation/order.validation.js";
import orderController from "@/controllers/portal.order.controller.js";
import portalAuth from "@/middlewares/portal-auth.js";

const router = express.Router();

router
  .route("/")
  .get(
    portalAuth(),
    validate(orderValidation.getOrders),
    orderController.getPortalUserOrders,
  )
  .post(validate(orderValidation.createOrder), orderController.createOrder);

router.route("/quote").post(orderController.requestOrderQuote);

router
  .route("/stats")
  .get(portalAuth(), orderController.getPortalUserOrderStats);
router
  .route("/recent")
  .get(portalAuth(), orderController.getPortalUserRecentOrders);

router
  .route("/:orderId")
  .get(
    portalAuth(),
    validate(orderValidation.getOrder),
    orderController.getOrder,
  );

export default router;
