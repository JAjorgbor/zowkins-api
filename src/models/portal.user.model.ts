import customValidation from "@/validation/custom.validation.js";
import bcrypt from "bcryptjs";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const portalUserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!customValidation.email.parse(value)) {
          throw new Error("Invalid email address");
        }
      },
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
    },
    // security: {
    //   password: {
    //     select: false,
    //     type: String,
    //     trim: true,
    //     minlength: 8,
    //     validate(value: string) {
    //       if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
    //         throw new Error(
    //           "Password must contain at least one letter and one number",
    //         );
    //       }
    //     },
    //     private: true,
    //   },
    //   authProvider: {
    //     type: String,
    //     required: true,
    //     enum: ["credentials"],
    //     default: "credentials",
    //   },
    // },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isReferralPartner: { type: Boolean, default: false },
    status: {
      type: String,
      default: "active",
      enum: ["pending", "active", "inactive", "waitlist"],
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Referral_Partner",
    },

    deliveryAddresses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Delivery_Address",
      },
    ],
    // app: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "App",
    // },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

portalUserSchema.virtual("orderCount", {
  ref: "Order",
  localField: "_id",
  foreignField: "customer",
  count: true,
});

portalUserSchema.virtual("paidOrders", {
  ref: "Order",
  localField: "_id",
  foreignField: "customer",
  match: { paymentStatus: "paid" },
});

portalUserSchema.virtual("totalSpent").get(function (this: any) {
  if (!this.paidOrders) return 0;
  return this.paidOrders.reduce((total: number, order: any) => {
    return total + (order.transaction?.totalAmount || 0);
  }, 0);
});

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
portalUserSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
portalUserSchema.methods.isPasswordMatch = async function (password: string) {
  const user = this;
  return bcrypt.compare(password, user.security.password);
};

// portalUserSchema.pre("save", async function () {
//   const user = this;
//   if (user.isModified("security.password")) {
//     if (user?.security?.password == undefined) {
//       return;
//     }

//     user.security.password = await bcrypt.hash(user.security.password, 8);
//   }
// });

export type PortalUserType = InferSchemaType<typeof portalUserSchema>;
export type PortalUserDoc = HydratedDocument<PortalUserType>;

const PortalUser = mongoose.model("Portal_User", portalUserSchema);

export default PortalUser;
