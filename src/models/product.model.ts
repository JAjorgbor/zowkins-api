import config from "@/config/config.js";
import r2 from "@/config/r2-client.js";
import generateUniqueSlug from "@/utils/generate-unique-slug.js";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import slugify from "slugify";

const productSchema = new mongoose.Schema(
  {
    name: {
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
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },
    specs: {
      type: Map,
      of: String,
      default: {},
    },
    images: [
      {
        _id: false,
        url: {
          type: String,
          required: true,
        },
        key: {
          type: String,
          required: true,
        },
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    visible: {
      type: Boolean,
      required: true,
      default: true,
    },
    inStock: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export type Product = InferSchemaType<typeof productSchema>;
export type ProductDoc = HydratedDocument<Product>;

productSchema.pre("validate", async function () {
  if (this.isModified("name")) {
    const baseSlug = (slugify as any)(this.name, {
      lower: true,
      strict: true,
      trim: true,
    });

    this.slug = await generateUniqueSlug(
      mongoose.model("Product"),
      baseSlug,
      this._id.toString(),
    );
  }
});

productSchema.pre(
  "deleteOne",
  { document: true },
  async function (this: ProductDoc) {
    if (!this.images?.length) return;

    const keys = this.images.map((image) => image.key);

    await r2.send(
      new DeleteObjectsCommand({
        Bucket: config.r2.bucket!,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      }),
    );
  },
);

const Product = mongoose.model<Product>("Product", productSchema);

export default Product;
