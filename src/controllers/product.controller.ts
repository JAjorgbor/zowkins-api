import productService from "@/services/product.service.js";
import ApiError from "@/utils/api-error.js";
import catchAsync from "@/utils/catch-async.js";
import { type Request, type Response } from "express";
import httpStatus from "http-status";

const getProduct = catchAsync(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const product: any = await productService.getProduct({
    slug: slug!,
    visible: true,
  });

  if (!product || !product?.category?.visible)
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  res.status(200).json(product);
});

export default { getProduct };
