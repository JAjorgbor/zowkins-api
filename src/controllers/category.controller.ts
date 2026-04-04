import categoryService from "@/services/category.service.js";
import productService from "@/services/product.service.js";
import ApiError from "@/utils/api-error.js";
import catchAsync from "@/utils/catch-async.js";
import httpStatus from "http-status";
import { getPagination } from "@/utils/pagination.js";
import type { Request, Response } from "express";

const getCategories = catchAsync(async (req: Request, res: Response) => {
  const pagination = getPagination(req.query);
  const result = await categoryService.getVisibleCategories(pagination);
  res.status(200).json(result);
});

const getCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.getCategory({
    slug: req.params.slug,
    visible: true,
  });
  res.status(200).json(result);
});

const getCategoryProducts = catchAsync(async (req: Request, res: Response) => {
  const pagination = getPagination(req.query);
  const max = req.query.maxPrice as string;
  const min = req.query.minPrice as string;
  const subcategorySlugs = (
    Array.isArray(req.query.subcategories)
      ? req.query.subcategories
      : req.query.subcategories
      ? [req.query.subcategories]
      : []
  ) as string[];
  const category = await categoryService.getCategory({
    slug: req.params.slug,
    visible: true,
  });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }
  const result = await productService.getVisibleProductsForCategory(
    category._id.toString(),
    pagination,
    { priceRange: { max, min }, subcategorySlugs }
  );
  res.status(200).json(result);
});

export default { getCategories, getCategory, getCategoryProducts };
