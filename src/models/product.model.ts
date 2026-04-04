import r2 from "@/config/r2-client.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import config from "@/config/config.js";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import slugify from "slugify";
import generateUniqueSlug from "@/utils/generate-unique-slug.js";

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
  }
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
      this._id.toString()
    );
  }
});

productSchema.pre(
  "deleteOne",
  { document: true },
  async function (this: ProductDoc) {
    if (!this.image?.key) return;
    await r2.send(
      new DeleteObjectCommand({
        Bucket: config.r2.bucket!,
        Key: this.image.key,
      })
    );
  }
);

const Product = mongoose.model<Product>("Product", productSchema);

export default Product;
