import config from "@/config/config.js";
import generateUniqueSlug from "@/utils/generate-unique-slug.js";
import r2 from "@/config/r2-client.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import slugify from "slugify";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    image: {
      url: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
    },
    visible: {
      type: Boolean,
      required: true,
      default: true,
    },
    subcategories: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Subcategory",
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export type CategoryType = InferSchemaType<typeof categorySchema>;
export type CategoryDoc = HydratedDocument<CategoryType>;

categorySchema.pre("validate", async function () {
  if (this.isModified("name")) {
    const baseSlug = (slugify as any)(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    this.slug = await generateUniqueSlug(
      mongoose.model("Category"),
      baseSlug,
      this._id.toString()
    );
  }
});

categorySchema.pre(
  "deleteOne",
  { document: true },
  async function (this: CategoryDoc) {
    if (!this.image?.key) return;
    await r2.send(
      new DeleteObjectCommand({
        Bucket: config.r2.bucket!,
        Key: this.image.key,
      })
    );
  }
);

categorySchema.virtual("productsCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true, // <-- key: returns a number, not docs
});

categorySchema.virtual("visibleProductsCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true, // <-- key: returns a number, not docs
  match: { visible: true }, // ✅ only count visible products
});

const Category = mongoose.model<CategoryType>("Category", categorySchema);

export default Category;
