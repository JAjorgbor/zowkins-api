import type {
  Subcategory,
  SubcategoryDoc,
} from "@/models/subcategory.model.js";
import SubcategoryModel from "@/models/subcategory.model.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";

const getSubcategory = async (filterOptions: any) => {
  try {
    const subcategory = await SubcategoryModel.findOne(filterOptions);
    if (!subcategory) {
      throw new ApiError(httpStatus.NOT_FOUND, "Subcategory not found");
    }
    return subcategory;
  } catch (error: any) {
    if (error instanceof ApiError) {
      // re-throw known ApiErrors without wrapping
      throw error;
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || "Unable to fetch subcategory",
      false,
      error.stack
    );
  }
};

const createManySubcategories = async (subcategories: Subcategory[]) => {
  return await SubcategoryModel.insertMany(subcategories);
};

const updateManySubcategories = async (subcategories: SubcategoryDoc[]) => {
  const updatedDocs: SubcategoryDoc[] = [];

  for (const item of subcategories) {
    const doc = await SubcategoryModel.findById(item._id);
    if (!doc) {
      let newDoc = await SubcategoryModel.create(item);
      updatedDocs.push(newDoc);

      continue;
    }

    // Copy all fields except _id
    Object.assign(doc, { ...item, _id: doc._id });

    await doc.save(); // triggers pre('validate') middleware
    updatedDocs.push(doc);
  }

  return updatedDocs;
};

export default {
  getSubcategory,
  createManySubcategories,
  updateManySubcategories,
};
