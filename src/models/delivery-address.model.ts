import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

export const deliveryAddressSchema = new mongoose.Schema({
  label: {
    type: String,
  },
  phoneNumber: {
    type: String,
  },
  street: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
    default: "nigeria",
  },
  postalCode: {
    type: String,
  },
});

export type DeliveryAddressType = InferSchemaType<typeof deliveryAddressSchema>;
export type DeliveryAddressDoc = HydratedDocument<DeliveryAddressType>;

const DeliveryAddress = mongoose.model(
  "Delivery_Address",
  deliveryAddressSchema
);

export default DeliveryAddress;
