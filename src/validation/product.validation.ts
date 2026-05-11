import customValidation from "@/validation/custom.validation.js";
import z from "zod";

const createProduct = z.object({
  name: customValidation.required(z.string(), "Name is required"),
  category: customValidation.required(z.string(), "Category is required"),
  subcategory: customValidation.required(z.string(), "Subcategory is required"),
  price: customValidation.required(z.number(), "Price is required"),
  description: customValidation.required(z.string(), "Description is required"),
  visible: customValidation.required(z.boolean(), "Visible is required"),
  inStock: customValidation.required(z.boolean(), "In Stock is required"),
  specs: z.record(z.string(), z.string()).optional(),
});

const updateProduct = z.object({
  name: customValidation.required(z.string(), "Name is required"),
  category: customValidation.required(z.string(), "Category is required"),
  subcategory: customValidation.required(z.string(), "Subcategory is required"),
  price: customValidation.required(z.number(), "Price is required"),
  description: customValidation.required(z.string(), "Description is required"),
  visible: customValidation.required(z.boolean(), "Visible is required"),
  inStock: customValidation.required(z.boolean(), "In Stock is required"),
  specs: z.record(z.string(), z.string()).optional(),
});

export default {
  createProduct,
  updateProduct,
};
