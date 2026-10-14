import Product, { type ProductDoc } from "@/models/product.model.js";
import Subcategory from "@/models/subcategory.model.js";
import categoryService from "@/services/category.service.js";
import ApiError from "@/utils/api-error.js";
import type { PaginationResult } from "@/utils/pagination.js";
import { handleAssetUpload } from "@/utils/upload-asset.js";
import customValidation from "@/validation/custom.validation.js";
import productValidation from "@/validation/product.validation.js";
import type { Request } from "express";
import httpStatus from "http-status";
import { Types } from "mongoose";

const getProduct = async (filterOptions: any) => {
  const product = await Product.findOne(filterOptions)
    .populate("category")
    .populate("subcategory");

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  }
  return product;
};

const getProducts = async () => {
  const products = await Product.find()
    .populate("category")
    .populate("subcategory");

  return products;
};

const getVisibleProductsForCategory = async (
  categoryId: string,
  pagination: PaginationResult,
  filterOptions?: {
    priceRange?: { max: string; min: string };
    subcategorySlugs?: string[];
  },
) => {
  const { limit, skip, getPaginationMeta } = pagination;
  let products = [];
  let total = 0;

  const filter: Record<string, any> = {
    visible: true,
    category: categoryId,
  };

  if (filterOptions) {
    let subcategories = [];
    if (filterOptions.subcategorySlugs?.length) {
      subcategories = await Subcategory.find({
        slug: { $in: filterOptions.subcategorySlugs },
        category: categoryId,
      }).select("_id");
    }

    if (subcategories.length) {
      filter.subcategory = { $in: subcategories };
    }
    if (filterOptions.priceRange) {
      filter.price = {
        $gte: Number(filterOptions.priceRange?.min || 0),
        $lte: Number(filterOptions.priceRange?.max || Number.MAX_SAFE_INTEGER),
      };
    }
  }
  products = await Product.find(filter)
    .populate("category")
    .populate("subcategory")
    .skip(skip)
    .limit(limit);
  total = await Product.countDocuments(filter);

  const maxPriceQueryResult = await Product.aggregate([
    { $match: { visible: true } },
    {
      $group: {
        _id: null,
        maxPrice: { $max: "$price" },
      },
    },
  ]);

  const maxPrice = maxPriceQueryResult[0]?.maxPrice ?? 0;

  const meta = getPaginationMeta(total, products.length);

  return { products, meta, maxPrice };
};

const createProduct = async (req: Request) => {
  const _id = new Types.ObjectId();

  let payload: ProductDoc;
  const { files: images, fields } = await handleAssetUpload(
    req,
    `products/${_id}`,
    {
      fields: productValidation.createProduct,
      file: customValidation.fileSchema,
      maxFiles: 6,
      requireFile: true,
      callback: async (parsedFields) => {
        const category = await categoryService.getCategory({
          _id: parsedFields.category,
        });

        if (
          !category.subcategories.find(
            (each) => each._id == parsedFields.subcategory,
          )
        ) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Selected subcategory does not belong to ${category.name}`,
          );
        }
      },
    },
    ".jpg",
  );
  payload = { ...fields, images, _id };
  const product = await Product.create(payload);
  return product;
};
const updateProduct = async (productId: string, req: Request) => {
  const { files: images, fields } = await handleAssetUpload(
    req,
    `products/${productId}`,
    {
      fields: productValidation.updateProduct,
      file: customValidation.fileSchema,
      maxFiles: 6,
      requireFile: true,
      callback: async (parsedFields) => {
        const category = await categoryService.getCategory({
          _id: parsedFields.category,
        });

        if (
          !category.subcategories.find(
            (each) => each._id == parsedFields.subcategory,
          )
        ) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Selected subcategory does not belong to ${category.name}`,
          );
        }
      },
    },
    ".jpg",
  );

  let payload: ProductDoc = { ...fields, images };

  const product = await Product.findById(productId);
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");

  product.set(payload);

  await product.save();

  return product;
};

const deleteProduct = async (id: string) => {
  const product = await Product.findById(id);
  if (!product) throw new ApiError(httpStatus.NOT_FOUND, "Product not found");

  await product.deleteOne();

  return "Product deleted successfully";
};

const getGeneralProductsStats = async () => {
  const total = await Product.countDocuments();
  const visible = await Product.countDocuments({ visible: true });
  const invisible = await Product.countDocuments({ visible: false });
  const instock = await Product.countDocuments({ inStock: true });
  const outofstock = await Product.countDocuments({ inStock: false });

  const totalInventoryUnitCostResult = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalInventoryUnitCost: { $sum: "$price" },
      },
    },
  ]);

  const totalInventoryUnitCost =
    totalInventoryUnitCostResult[0]?.totalInventoryUnitCost ?? 0;

  return {
    total,
    visible,
    invisible,
    instock,
    outofstock,
    totalInventoryUnitCost,
  };
};

export default {
  getProduct,
  getProducts,
  createProduct,
  updateProduct,
  getVisibleProductsForCategory,
  deleteProduct,
  getGeneralProductsStats,
};
