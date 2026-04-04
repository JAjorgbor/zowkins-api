import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import slugify from "slugify";

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  { timestamps: true }
);

export type Subcategory = InferSchemaType<typeof subcategorySchema>;
export type SubcategoryDoc = HydratedDocument<Subcategory>;

subcategorySchema.pre("validate", async function () {
  if (this.isModified("name")) {
    this.slug = (slugify as any)(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    let exists = await mongoose.model("Subcategory").findOne({
      _id: { $ne: this._id },
      category: this.category,
      slug: this.slug,
    });

    let counter = 1;
    while (exists) {
      this.slug = `${this.slug}-${counter++}`;
      exists = await mongoose.model("Subcategory").findOne({
        _id: { $ne: this._id },
        category: this.category,
        slug: this.slug,
      });
    }
  }
});

const Subcategory = mongoose.model<Subcategory>(
  "Subcategory",
  subcategorySchema
);
export default Subcategory;
