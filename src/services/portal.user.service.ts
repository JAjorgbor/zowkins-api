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
  if (await (PortalUser as any).isEmailTaken(userBody.email)) {
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

  return await PortalUser.create(userBody);
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
  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    pendingUsers,
  };
};

export default {
  createPortalUser,
  updatePortalUser,
  getPortalUser,
  getPortalUsers,
  deletePortalUser,
  updatePortalUserPassword,
  getGeneralPortalUsersStats,
};
