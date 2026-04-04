import { createSwaggerSpec } from "@/docs/v1/swagger-def.js";
import adminAuthRoute from "@/routes/v1/admin.auth.route.js";
import adminCategoryRoute from "@/routes/v1/admin.category.route.js";
import adminCustomerRoute from "@/routes/v1/admin.customer.route.js";
import adminDeliveryMethodRoute from "@/routes/v1/admin.delivery-method.route.js";
import adminOrderRoute from "@/routes/v1/admin.order.route.js";
import adminProductRoute from "@/routes/v1/admin.product.route.js";
import adminReferralPartnerRoute from "@/routes/v1/admin.referral-partner.route.js";
import adminTeamRoute from "@/routes/v1/admin.team.route.js";
import adminUserRoute from "@/routes/v1/admin.user.route.js";
import appRoute from "@/routes/v1/app.route.js";
import categoryRoute from "@/routes/v1/category.route.js";
import deliveryMethodRoute from "@/routes/v1/delivery-method.route.js";
import portalAuthRoute from "@/routes/v1/portal.auth.route.js";
import portalDeliveryAddressRoute from "@/routes/v1/portal.delivery-address.route.js";
import portalOrderRoute from "@/routes/v1/portal.order.route.js";
import portalReferralPartnerRoute from "@/routes/v1/portal.referral-partner.route.js";
import portalUserRoute from "@/routes/v1/portal.user.route.js";
import productRoute from "@/routes/v1/product.route.js";
import testRoute from "@/routes/v1/test.js";
import adminBankRoute from "@/routes/v1/admin.bank.route.js";
import express, { Router } from "express";
import swaggerUi from "swagger-ui-express";
import portalBankRoute from "@/routes/v1/portal.bank.route.js";

const router: Router = express.Router();

const defaultRoutes = [
  {
    path: "/app",
    route: appRoute,
  },
  {
    path: "/test",
    route: testRoute,
  },
  {
    path: "/products",
    route: productRoute,
  },
  {
    path: "/categories",
    route: categoryRoute,
  },
  {
    path: "/delivery-methods",
    route: deliveryMethodRoute,
  },
  {
    path: "/portal/auth",
    route: portalAuthRoute,
  },
  {
    path: "/portal/users",
    route: portalUserRoute,
  },
  // {
  //   path: "/portal/referral-partners",
  //   route: portalReferralPartnerRoute,
  // },
  {
    path: "/portal/delivery-address",
    route: portalDeliveryAddressRoute,
  },
  {
    path: "/portal/orders",
    route: portalOrderRoute,
  },
  // {
  //   path: "/portal/banks",
  //   route: portalBankRoute,
  // },
  // ADMIN ROUTES
  {
    path: "/admin/auth",
    route: adminAuthRoute,
  },
  {
    path: "/admin/users",
    route: adminUserRoute,
  },
  // {
  //   path: "/admin/banks",
  //   route: adminBankRoute,
  // },
  {
    path: "/admin/customers",
    route: adminCustomerRoute,
  },
  {
    path: "/admin/categories",
    route: adminCategoryRoute,
  },
  {
    path: "/admin/products",
    route: adminProductRoute,
  },
  {
    path: "/admin/team",
    route: adminTeamRoute,
  },
  // {
  //   path: "/admin/referral-partners",
  //   route: adminReferralPartnerRoute,
  // },
  {
    path: "/admin/delivery-methods",
    route: adminDeliveryMethodRoute,
  },
  {
    path: "/admin/orders",
    route: adminOrderRoute,
  },
];

defaultRoutes.forEach((route) => router.use(route.path, route.route));

router.use("/docs", swaggerUi.serve, (req: any, res: any, next: any) =>
  swaggerUi.setup(createSwaggerSpec())(req, res, next),
);

export default router;
