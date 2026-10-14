import express, { Router } from "express";
import auth from "@/middlewares/admin-auth.js";
import validate from "@/middlewares/validate.js";
import adminCustomerController from "@/controllers/admin.customer.controller.js";
import adminCustomerValidation from "@/validation/admin.customer.validation.js";
import deliveryAddressController from "@/controllers/delivery-address.controller.js";
import deliveryAddressValidation from "@/validation/delivery-address.validation.js";

const router: Router = express.Router();

router.get(
  "/",
  auth("getUsers"),
  validate(adminCustomerValidation.getCustomers),
  adminCustomerController.getCustomers,
);

// router.get(
//   "/non-referral-partners",
//   auth("manageCustomers"),
//   validate(adminCustomerValidation.getNonReferralPartners),
//   adminCustomerController.getNonReferralPartners,
// );

router.get(
  "/stats",
  auth("getUsers"),
  adminCustomerController.getGeneralCustomersStats,
);

router
  .route("/:userId")
  .get(
    auth("getUsers"),
    validate(adminCustomerValidation.getCustomer),
    adminCustomerController.getCustomer,
  )
  .patch(
    auth("manageCustomers"),
    validate(adminCustomerValidation.updateCustomer),
    adminCustomerController.updateCustomer,
  )
  .delete(
    auth("manageCustomers"),
    validate(adminCustomerValidation.deleteCustomer),
    adminCustomerController.deleteCustomer,
  );

router
  .route("/:userId/addresses")
  .get(auth("getUsers"), deliveryAddressController.getDeliveryAddresses)
  .post(
    auth("manageCustomers"),
    validate(deliveryAddressValidation.createDeliveryAddress),
    deliveryAddressController.createDeliveryAddress,
  );

router
  .route("/:userId/addresses/:addressId")
  .get(
    auth("getUsers"),
    validate(deliveryAddressValidation.getDeliveryAddress),
    deliveryAddressController.getDeliveryAddress,
  )
  .patch(
    auth("manageCustomers"),
    validate(deliveryAddressValidation.updateDeliveryAddress),
    deliveryAddressController.updateDeliveryAddress,
  )
  .delete(
    auth("manageCustomers"),
    validate(deliveryAddressValidation.deleteDeliveryAddress),
    deliveryAddressController.deleteDeliveryAddress,
  );

export default router;
