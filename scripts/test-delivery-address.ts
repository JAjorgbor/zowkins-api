import mongoose from "mongoose";
import config from "../src/config/config.js";
import deliveryAddressService from "../src/services/delivery-address.service.js";
import PortalUser from "../src/models/portal.user.model.js";
import DeliveryAddress from "../src/models/delivery-address.model.js";

async function verify() {
  console.log("Connecting to DB...");
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log("Connected to DB");
  } catch (err) {
    console.error("Failed to connect to DB", err);
    process.exit(1);
  }

  try {
    // 1. Create a dummy user
    const user = await PortalUser.create({
      firstName: "Test",
      lastName: "User",
      email: `test${Date.now()}@example.com`,
      phoneNumber: "08012345678",
      security: { password: "Password123" },
    });
    console.log("Created test user:", user._id);

    // 2. Create Delivery Address
    const addressData = {
      label: "Home",
      phoneNumber: "08011112222",
      street: "123 Test St",
      city: "Test City",
      state: "Test State",
    };
    const address = await deliveryAddressService.createDeliveryAddress(
      user._id.toString(),
      addressData
    );
    console.log("Created address:", address._id);

    // 3. Get Addresses
    const addresses = await deliveryAddressService.getDeliveryAddresses(
      user._id.toString()
    );
    console.log("Fetched addresses count:", addresses.length);
    if (addresses.length !== 1) throw new Error("Expected 1 address");

    // 4. Update Address
    const updated = await deliveryAddressService.updateDeliveryAddress(
      user._id.toString(),
      address._id.toString(),
      { city: "Updated City" }
    );
    console.log("Updated address city:", updated.city);
    if (updated.city !== "Updated City") throw new Error("Update failed");

    // 5. Delete Address
    await deliveryAddressService.deleteDeliveryAddress(
      user._id.toString(),
      address._id.toString()
    );
    console.log("Deleted address");

    // 6. Verify Deletion
    const addressesAfterDelete =
      await deliveryAddressService.getDeliveryAddresses(user._id.toString());
    console.log("Addresses after delete:", addressesAfterDelete.length);
    if (addressesAfterDelete.length !== 0) throw new Error("Delete failed");

    // Cleanup
    await PortalUser.findByIdAndDelete(user._id);
    console.log("Cleanup done");
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verify();
