import mongoose from "mongoose";

async function generateUniqueSlug(
  Model: mongoose.Model<any>,
  baseSlug: string,
  excludeId?: string
) {
  let slug = baseSlug;
  let counter = 1;

  while (
    await Model.exists({
      slug,
      ...(excludeId && { _id: { $ne: excludeId } }),
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
}

export default generateUniqueSlug;
