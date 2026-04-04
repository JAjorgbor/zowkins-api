import express, { Router } from "express";
import adminCategoryController from "@/controllers/admin.category.controller.js";
import auth from "@/middlewares/admin-auth.js";

const router: Router = express.Router();

router.get("/", auth("getInventory"), adminCategoryController.getCategories);

router.get(
  "/:id",
  auth("getInventory"),
  adminCategoryController.getCategoryById
);

router.post(
  "/",
  auth("updateInventory"),
  adminCategoryController.createCategory
);

router.patch(
  "/:id",
  auth("updateInventory"),
  adminCategoryController.updateCategory
);

router.delete(
  "/:id",
  auth("updateInventory"),
  adminCategoryController.deleteCategory
);

export default router;
