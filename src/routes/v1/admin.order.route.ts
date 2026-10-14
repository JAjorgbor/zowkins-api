import express from "express";
import validate from "@/middlewares/validate.js";
import orderValidation from "@/validation/order.validation.js";
import orderController from "@/controllers/admin.order.controller.js";
import auth from "@/middlewares/admin-auth.js";

const router = express.Router();

router
  .route("/")
  .get(
    auth("getOrders"),
    validate(orderValidation.getOrders),
    orderController.getOrders,
  )
  .post(
    auth("manageOrders"),
    validate(orderValidation.adminCreateOrder),
    orderController.createOrder,
  );

router
  .route("/stats")
  .get(auth("getOrders"), orderController.getGeneralOrdersStats);

router
  .route("/:orderId")
  .get(
    auth("getOrders"),
    validate(orderValidation.adminGetOrder),
    orderController.getOrder,
  )
  .patch(
    auth("manageOrders"),
    validate(orderValidation.updateOrder),
    orderController.updateOrderStatus,
  );

router
  .route("/:orderId/products")
  .patch(
    auth("manageOrders"),
    validate(orderValidation.updateOrderProducts),
    orderController.updateOrderProducts,
  );

router.post(
  "/:orderId/generate-payment-link",
  auth("manageOrders"),
  validate(orderValidation.generatePaymentLink),
  orderController.generatePaymentLink,
);

export default router;
