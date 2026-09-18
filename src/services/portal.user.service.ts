import PortalUser, {
  type PortalUserDoc,
  type PortalUserType,
} from "@/models/portal.user.model.js";
import type { EmailVerificationDoc } from "@/models/email-verification.model.js";
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

/**
 * Create the account for a sign-up whose email has just been verified
 * (called only by emailVerificationService.verifyCode).
 * If the email belongs to a guest customer, that record becomes the account
 * (same _id), so the guest's orders come along.
 */
const completeSignup = async (verification: EmailVerificationDoc) => {
  const { signup, email } = verification;
  if (!signup?.passwordHash || !signup.firstName || !signup.phoneNumber) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid sign-up session");
  }

  const existingUser = await PortalUser.findOne({ email });
  if (existingUser && existingUser.accountType !== "guest") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }

  const user = existingUser ?? new PortalUser({ email });
  user.set({
    firstName: signup.firstName,
    lastName: signup.lastName,
    gender: signup.gender,
    phoneNumber: signup.phoneNumber,
    dateOfBirth: signup.dateOfBirth,
    ...(signup.referredBy && { referredBy: signup.referredBy }),
    accountType: "registered",
    isEmailVerified: true,
  });
  user.set("security.password", signup.passwordHash);
  // Hashed at sign-up; tell the pre-save hook not to hash it again
  user.$locals.passwordIsHashed = true;

  try {
    await user.save();
  } catch (error: any) {
    // A parallel sign-up for the same new email completed first
    if (error?.code === 11000) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }
    throw error;
  }
  return user;
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
  // A new address hasn't been proven yet; the customer verifies it at next login
  if (updateBody.email && updateBody.email.toLowerCase().trim() !== user.email) {
    updateBody.isEmailVerified = false;
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
  completeSignup,
  upsertGuestCustomer,
  updatePortalUser,
  getPortalUser,
  getPortalUsers,
  deletePortalUser,
  updatePortalUserPassword,
  getGeneralPortalUsersStats,
};
