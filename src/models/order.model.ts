import { deliveryAddressSchema } from "@/models/delivery-address.model.js";
import { deliveryMethodSchema } from "@/models/delivery-method.model.js";
import moment from "moment";
import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Portal_User",
      required: true,
    },

    products: [
      {
        // dynamic ref to reference multiple different mongoose models
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productImage: {
          url: {
            type: String,
          },
          key: {
            type: String,
          },
        },
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
      },
    ],

    transaction: {
      //   ref: {
      //     type: String,
      //   },
      discountCode: {
        type: String,
      },
      discount: {
        type: Number,
      },
      deliveryFee: {
        type: Number,
      },
      subTotal: {
        type: Number,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
      // paymentMethod: {
      //   type: String,
      //   required: true,
      //   enum: [
      //     "direct-bank-transfer",
      //     "flutterwave",
      //     "paystack",
      //     "wallet-balance",
      //   ],
      //   default: "paystack",
      // },
    },

    deliveryAddress: deliveryAddressSchema,
    deliveryMethod: deliveryMethodSchema,
    orderStatus: {
      type: String,
      enum: ["processing", "in-transit", "cancelled", "delivered"],
      default: "processing",
      required: true,
    },
    orderAudit: {
      processedAt: {
        type: mongoose.Schema.Types.Mixed,
        default: "not-available",
      },
      inTransitAt: {
        type: mongoose.Schema.Types.Mixed,
        default: "not-available",
      },
      cancelledAt: {
        type: mongoose.Schema.Types.Mixed,
        default: "not-available",
      },
      deliveredAt: {
        type: mongoose.Schema.Types.Mixed,
        default: "not-available",
      },
    },

    paymentStatus: {
      type: String,
      required: true,
      default: "pending",
      enum: ["pending", "paid", "failed", "abandoned", "reversed"],
    },
    note: {
      type: String,
    },
    trackingId: {
      type: String,
    },
    referralDetails: {
      referralPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Referral_Partner",
      },
      accountDetails: {
        accountName: {
          type: String,
        },
        bankName: {
          type: String,
        },
        accountNumber: {
          type: String,
        },
        bankCode: {
          type: String,
        },
      },
      commission: {
        rate: {
          type: Number,
        },
        rateType: {
          type: String,
          enum: ["percentage", "fixed"],
        },
        amount: {
          type: Number,
        },
        status: {
          type: String,
          enum: ["paid", "pending", "cancelled"],
          default: "pending",
        },
        note: {
          type: String,
        },
      },
    },
  },
  { timestamps: true },
);

orderSchema.pre("validate", async function () {
  if (!this.orderNumber) {
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const datePart = moment().format("DDMMYY");
      const randomPart = Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase();
      const generatedOrderNumber = `ORD-${datePart}-${randomPart}`;

      const existingOrder = await mongoose.model("Order").findOne({
        orderNumber: generatedOrderNumber,
      });

      if (!existingOrder) {
        this.orderNumber = generatedOrderNumber;
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error(
        "Failed to generate a unique order number after multiple attempts.",
      );
    }
  }
});

export type OrderType = InferSchemaType<typeof orderSchema>;
export type OrderDoc = HydratedDocument<OrderType>;

const Order = mongoose.model("Order", orderSchema);
export default Order;
