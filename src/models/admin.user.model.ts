import customValidation from "@/validation/custom.validation.js";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";
import bcrypt from "bcryptjs";
import roles from "@/config/roles.js";
import r2 from "@/config/r2-client.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import config from "@/config/config.js";

const adminUserSchema = new mongoose.Schema({
  avatar: {
    url: {
      type: String,
    },
    key: {
      type: String,
    },
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },

  lastName: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    require: true,
    unique: true,
    trim: true,
    lowercase: true,
    validate(value) {
      if (!customValidation.email.parse(value)) {
        throw new Error("Invalid email address");
      }
    },
  },

  password: {
    select: false,
    type: String,
    // required: true,
    trim: true,
    minlength: 6,
    validate(value: string) {
      if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
        throw new Error(
          "Password must contain at least one letter and one number",
        );
      }
    },
    private: true, // used by the toJSON plugin
  },

  status: {
    type: String,
    enum: ["pending", "active", "inactive"],
    default: "pending",
  },

  role: {
    type: String,
    enum: roles.adminUserRoleOptions,
    default: "none",
  },

  dateOfBirth: {
    type: Date,
  },

  gender: {
    type: String,
    enum: ["Male", "Female"],
    immutable: true,
  },

  phoneNumber: {
    type: String,
  },
});

adminUserSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

adminUserSchema.methods.isPasswordMatch = async function (password: string) {
  const adminUser = this;
  return bcrypt.compare(password, adminUser.password);
};

adminUserSchema.pre("save", async function (next) {
  const adminUser = this;
  if (this.isModified("password") && adminUser.password) {
    adminUser.password = await bcrypt.hash(adminUser.password, 8);
  }
});

adminUserSchema.pre(
  "deleteOne",
  { document: true },
  async function (this: AdminUserDoc) {
    if (!this.avatar?.key) return;
    await r2.send(
      new DeleteObjectCommand({
        Bucket: config.r2.bucket!,
        Key: this.avatar.key,
      }),
    );
  },
);

export type AdminUserType = InferSchemaType<typeof adminUserSchema>;
export type AdminUserDoc = HydratedDocument<AdminUserType>;

const AdminUser = mongoose.model("Admin_User", adminUserSchema);

export default AdminUser;
