import productService from "@/services/product.service.js";
import type { Request, Response } from "express";
import catchAsync from "@/utils/catch-async.js";

const getProducts = catchAsync(async (req: Request, res: Response) => {
  // const pagination = getPagination(req.query);
  const products = await productService.getProducts();
  res.status(200).json({ products });
});

const getProductById = catchAsync(async (req: Request, res: Response) => {
  // const pagination = getPagination(req.query);
  const product = await productService.getProduct({ _id: req.params.id });
  res.status(200).json({ product });
});

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req);
  res.status(201).json({ product });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.params.id!, req);
  res.status(201).json({ product });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const message = await productService.deleteProduct(req.params.id!);
  res.status(201).json({ message });
});

const getGeneralProductsStats = catchAsync(
  async (req: Request, res: Response) => {
    const stats = await productService.getGeneralProductsStats();
    res.status(200).json({ stats });
  },
);

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getGeneralProductsStats,
};
