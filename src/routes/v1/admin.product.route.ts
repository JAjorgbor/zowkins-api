import express, { Router } from "express";
import adminProductController from "@/controllers/admin.product.controller.js";
import auth from "@/middlewares/admin-auth.js";

const router: Router = express.Router();

router.get("/", auth("getInventory"), adminProductController.getProducts);

router.post("/", auth("updateInventory"), adminProductController.createProduct);

router.get(
  "/stats",
  auth("getInventory"),
  adminProductController.getGeneralProductsStats,
);

router.get("/:id", auth("getInventory"), adminProductController.getProductById);

router.patch(
  "/:id",
  auth("updateInventory"),
  adminProductController.updateProduct,
);

router.delete(
  "/:id",
  auth("updateInventory"),
  adminProductController.deleteProduct,
);

export default router;
