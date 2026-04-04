import productController from "@/controllers/product.controller.js";
import express, { Router } from "express";

const router: Router = express.Router();

router.get("/:slug", productController.getProduct);

export default router;
