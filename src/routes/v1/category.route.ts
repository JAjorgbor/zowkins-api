import categoryController from "@/controllers/category.controller.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.get("/:slug", categoryController.getCategory);
router.get("/:slug/products", categoryController.getCategoryProducts);
router.get("/", categoryController.getCategories);

export default router;
