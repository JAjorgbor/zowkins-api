import mongoose from "mongoose";

export const deliveryMethodSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDeliveryTime: {
      type: String,
      required: true,
      trim: true, // e.g., "2-3 business days"
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    visibility: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const DeliveryMethod = mongoose.model("Delivery_Method", deliveryMethodSchema);

export default DeliveryMethod;
