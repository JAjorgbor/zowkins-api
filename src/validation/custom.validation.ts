import z, { ZodArray, ZodNumber, ZodString, ZodType } from "zod";

const imageFileSchema = z.object({
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
  size: z.number().max(10 * 1024 * 1024), // 10MB
  filename: z.string().min(1),
});

const required = <T extends ZodType>(schema: T, message?: string): T => {
  const errorMsg = message || "This field is required";

  if (schema instanceof ZodString) {
    return schema.nonempty({ message: errorMsg }) as T;
  }

  if (schema instanceof ZodNumber) {
    return schema.refine((val) => val !== null && val !== undefined, {
      message: errorMsg,
    }) as T;
  }

  if (schema instanceof ZodArray) {
    return schema.min(1, { message: errorMsg }) as T;
  }

  // Fallback for other types
  return schema.refine((val) => val !== null && val !== undefined, {
    message: errorMsg,
  }) as T;
};

const email = required(z.email(), "Email address is required");

export default {
  imageFileSchema,
  required,
  email,
};
