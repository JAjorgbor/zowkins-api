import Category, { type CategoryDoc } from "@/models/category.model.js";
import type {
  Subcategory,
  SubcategoryDoc,
} from "@/models/subcategory.model.js";
import subcategoryService from "@/services/subcategory.service.js";
import ApiError from "@/utils/api-error.js";
import type { PaginationResult } from "@/utils/pagination.js";
import { handleAssetUpload } from "@/utils/upload-asset.js";
import adminCategoryValidation from "@/validation/category.validation.js";
import customValidation from "@/validation/custom.validation.js";
import type { Request } from "express";
import httpStatus from "http-status";
import { Types } from "mongoose";

const getCategories = async () =>
  // pagination: PaginationResult
  {
    // const { limit, skip, getPaginationMeta } = pagination;

    try {
      const categories = await Category.find()
        .populate("subcategories")
        .populate("productsCount");
      // .skip(skip).limit(limit);
      // const total = await Category.countDocuments();

      // const meta = getPaginationMeta(total, categories.length);

      return categories;
    } catch (error: any) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        error.message || "Unable to fetch categories",
        false,
        error.stack,
      );
    }
  };

const getVisibleCategories = async (pagination: PaginationResult) => {
  const { limit, skip, getPaginationMeta } = pagination;
  try {
    const categories = await Category.find({ visible: true })
      .populate("subcategories")
      .populate("visibleProductsCount")
      .skip(skip)
      .limit(limit);

    const total = await Category.countDocuments({ visible: true });
    const meta = getPaginationMeta(total, categories.length);
    return { categories, meta };
  } catch (error: any) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Unable to fetch categories",
      false,
      error.stack,
    );
  }
};

const getCategory = async (filterOptions: any) => {
  try {
    const category = await Category.findOne(filterOptions)
      .populate("subcategories")
      .populate("productsCount");
    if (!category) {
      throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
    }
    return category;
  } catch (error: any) {
    if (error instanceof ApiError) {
      // re-throw known ApiErrors without wrapping
      throw error;
    }

    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Unable to fetch category",
      false,
      error.stack,
    );
  }
};

const createCategory = async (req: Request) => {
  try {
    const _id = new Types.ObjectId();
    let payload: CategoryDoc;
    const { image, fields } = await handleAssetUpload(
      req,
      `categories/${_id}.jpg`,
      {
        fields: adminCategoryValidation.createCategory,
        file: customValidation.imageFileSchema,
        requireFile: true,
      },
    );
    let subcategories = fields.subcategories.map((each: Subcategory) => ({
      ...each,
      category: _id,
    }));

    subcategories =
      await subcategoryService.createManySubcategories(subcategories);

    fields.subcategories = subcategories.map(
      (each: SubcategoryDoc) => each._id,
    );

    payload = { ...fields, image, _id };

    const category = await Category.create(payload);
    return category;
  } catch (error: any) {
    if (error instanceof ApiError) {
      // re-throw known ApiErrors without wrapping
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Unable to create category",
      false,
      error.stack,
    );
  }
};

const updateCategory = async (categoryId: string, req: Request) => {
  try {
    const { image, fields } = await handleAssetUpload(
      req,
      `categories/${categoryId}.jpg`,
      {
        fields: adminCategoryValidation.updateCategory,
        file: customValidation.imageFileSchema,
        requireFile: true,
      },
    );

    let subcategories = fields.subcategories.map(
      (each: Subcategory & { _id?: string }) => {
        const fallbackId = new Types.ObjectId();

        return {
          ...each,
          _id: each._id === "none" ? fallbackId : each._id,
          category: categoryId,
        };
      },
    );

    subcategories =
      await subcategoryService.updateManySubcategories(subcategories);
    fields.subcategories = subcategories.map(
      (each: SubcategoryDoc) => each._id,
    );

    let payload: CategoryDoc = { ...fields, image };

    const category = await Category.findOne({ _id: categoryId });
    if (!category) {
      throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
    }
    category.set(payload);
    await category.save();

    return category;
  } catch (error: any) {
    if (error instanceof ApiError) {
      // re-throw known ApiErrors without wrapping
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Unable to update category",
      false,
      error.stack,
    );
  }
};

const deleteCategory = async (id: string) => {
  try {
    const category = await Category.findById(id).populate("productsCount");
    if (!category)
      throw new ApiError(httpStatus.NOT_FOUND, "Category not found");

    if ((category as any).productsCount > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Category has products");
    }

    await category.deleteOne();

    return "Category deleted successfully";
  } catch (error: any) {
    if (error instanceof ApiError) {
      // re-throw known ApiErrors without wrapping
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Unable to delete category",
      false,
      error.stack,
    );
  }
};

export default {
  createCategory,
  getCategories,
  getVisibleCategories,
  getCategory,

  updateCategory,
  deleteCategory,
};
