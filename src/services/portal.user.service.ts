import PortalUser, {
  type PortalUserDoc,
  type PortalUserType,
} from "@/models/portal.user.model.js";
import ReferralPartner from "@/models/referral-partner.model.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";

const getPortalUser = async (
  filterParams: Partial<PortalUserType & { _id: string }>,
  includePassword?: boolean,
) => {
  return await PortalUser.findOne(filterParams)
    .select(includePassword ? "+security.password" : "")
    .populate("orderCount")
    .populate({
      path: "paidOrders",
      select: "transaction.totalAmount",
    });
};

const getPortalUsers = async (filterParams: any = {}) => {
  return await PortalUser.find(filterParams)
    .populate({
      path: "referredBy",
      populate: {
        path: "user",
        select: "_id firstName lastName email",
      },
    })
    .populate("orderCount")
    .populate({
      path: "paidOrders",
      select: "transaction.totalAmount",
    });
};

const createPortalUser = async (userBody: any) => {
  const existingUser = await PortalUser.findOne({
    email: String(userBody.email).toLowerCase().trim(),
  });
  if (existingUser && existingUser.accountType !== "guest") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }

  // Handle referral code
  if (userBody.referralCode) {
    const partner = await ReferralPartner.findOne({
      referralCode: userBody.referralCode,
      status: "active",
    });
    if (partner) {
      userBody.referredBy = partner._id;
    }
  }

  // create security object
  const security = {
    password: userBody.password,
  };
  userBody.security = security;
  userBody.accountType = "registered";

  // Claim the guest record saved at checkout: same _id, so its orders come along
  if (existingUser) {
    const { password, referralCode, security, ...profile } = userBody;
    existingUser.set(profile);
    existingUser.set("security.password", password);
    await existingUser.save();
    return existingUser;
  }

  return await PortalUser.create(userBody);
};

type GuestCustomerDetails = {
  firstName: string;
  lastName?: string | undefined;
  gender?: "male" | "female" | undefined;
  email: string;
  phoneNumber: string;
};

/**
 * Find or create the customer record for a checkout made without logging in.
 * - New email: a guest record is created.
 * - Existing guest: contact details are refreshed with the latest checkout.
 * - Registered account: returned untouched (anonymous checkouts never edit a real profile).
 */
const upsertGuestCustomer = async (details: GuestCustomerDetails) => {
  const email = details.email.toLowerCase().trim();
  const contact = {
    firstName: details.firstName,
    phoneNumber: details.phoneNumber,
    ...(details.lastName !== undefined && { lastName: details.lastName }),
    ...(details.gender !== undefined && { gender: details.gender }),
  };

  let user = await PortalUser.findOne({ email });
  if (!user) {
    try {
      return await PortalUser.create({ ...contact, email, accountType: "guest" });
    } catch (error: any) {
      // Two checkouts with the same new email raced; use the record that won
      if (error?.code !== 11000) throw error;
      user = await PortalUser.findOne({ email });
      if (!user) throw error;
    }
  }

  if (user.accountType === "guest") {
    user.set(contact);
    await user.save();
  } else if (user.status !== "active") {
    throw new ApiError(httpStatus.FORBIDDEN, "This account is not active");
  }
  return user;
};

const updatePortalUser = async (userId: any, updateBody: any) => {
  const user = await getPortalUser({ _id: userId });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Portal user not found");
  }
  if (
    updateBody.email &&
    (await (PortalUser as any).isEmailTaken(updateBody.email, userId))
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const deletePortalUser = async (userId: string) => {
  const user = await getPortalUser({ _id: userId });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Portal user not found");
  }
  await user.deleteOne();
  return user;
};

const updatePortalUserPassword = async (
  userId: string,
  {
    currentPassword,
    newPassword,
  }: { currentPassword: string; newPassword: string },
) => {
  const user = await getPortalUser({ _id: userId }, true);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Portal user not found");
  }
  console.log(currentPassword);
  const isCurrentPasswordCorrect = await (user as any).isPasswordMatch(
    currentPassword,
  );
  if (!isCurrentPasswordCorrect)
    throw new ApiError(httpStatus.BAD_REQUEST, "Current password is incorrect");

  user.security!.password = newPassword;
  await user.save();
  return user;
};

const getGeneralPortalUsersStats = async () => {
  const totalUsers = await PortalUser.countDocuments();
  const activeUsers = await PortalUser.countDocuments({
    status: "active",
  });
  const inactiveUsers = await PortalUser.countDocuments({
    status: "inactive",
  });
  const pendingUsers = await PortalUser.countDocuments({
    status: "pending",
  });
  const guestUsers = await PortalUser.countDocuments({
    accountType: "guest",
  });
  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    pendingUsers,
    registeredUsers: totalUsers - guestUsers,
    guestUsers,
  };
};

export default {
  createPortalUser,
  upsertGuestCustomer,
  updatePortalUser,
  getPortalUser,
  getPortalUsers,
  deletePortalUser,
  updatePortalUserPassword,
  getGeneralPortalUsersStats,
};
