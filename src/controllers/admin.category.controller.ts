import categoryService from "@/services/category.service.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";

const getCategories = catchAsync(async (req: Request, res: Response) => {
  // const pagination = getPagination(req.query);
  const categories = await categoryService.getCategories();
  res.status(200).json({ categories });
});

const getCategoryById = catchAsync(async (req: Request, res: Response) => {
  // const pagination = getPagination(req.query);
  const category = await categoryService.getCategory({ _id: req.params.id });
  res.status(200).json({ category });
});

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req);
  res.status(201).json({ category });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await categoryService.updateCategory(req.params.id!, req);
  res.status(201).json({ category });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const message = await categoryService.deleteCategory(req.params.id!);
  res.status(201).json({ message });
});

export default {
  getCategories,
  createCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
