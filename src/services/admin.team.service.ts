import httpStatus from "http-status";
import AdminUser, { type AdminUserType } from "@/models/admin.user.model.js";
import AdminUserService from "@/services/admin.user.service.js";
import ApiError from "@/utils/api-error.js";
import tokenService from "@/services/token.service.js";
import tokenTypes from "@/config/tokens.js";
import Token from "@/models/token.model.js";

/**
 * Get all admin team members
 * @returns {Promise<[AdminUser]>}
 */
const getAdminUsers = async (filter?: any) => {
  return AdminUser.find(filter);
};

/**
 * Update admin user status
 * @param {ObjectId}
 * @param {string} status
 * @returns {Promise<Void>}
 */
const updateAdminUserStatus = async (id: string, status: string) => {
  await AdminUser.updateOne({ _id: id }, { status });
};

/**
 * Update admin user role
 * @param {ObjectId}
 * @param {string} role
 * @returns {Promise<Void>}
 */
const updateAdminUserRole = async (id: string, role: string) => {
  await AdminUser.updateOne({ _id: id }, { role });
};

/**
 * Update admin user by email
 * @param {ObjectId}
 * @param {string} body
 * @returns {Promise<Void>}
 */
const updateAdminUser = async (id: string, body: Partial<AdminUserType>) => {
  const adminUser = await AdminUser.findOne({ _id: id });
  if (!adminUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin User not found");
  }
  Object.assign(adminUser, body);
  await adminUser.save();
  return adminUser;
};

/**
 * Remove team member by id
 * @param {ObjectId} userId
 * @returns {Promise<AdminUser>}
 */
const removeAdminUser = async (userId: string) => {
  const adminUser = await AdminUserService.getAdminUser({ _id: userId });
  if (!adminUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "admin User not found");
  }
  await adminUser.deleteOne();
  return adminUser;
};

const acceptInvite = async (token: string, password: string) => {
  const tokenDoc: any = await tokenService.verifyToken(
    token!,
    tokenTypes.INVITE_ADMIN_USER,
    "Admin_User",
  );

  const user = await updateAdminUser(tokenDoc.user!, {
    password,
    status: "active",
  });
  if (!user) {
    throw new ApiError(404, "Admin user not found");
  }
  const tokens = await tokenService.generateAuthTokens(user, "Admin_User");
  await Token.deleteMany({
    user: user._id,
    type: tokenTypes.INVITE_ADMIN_USER,
  });
  return { user, tokens };
};

export default {
  acceptInvite,
  getAdminUsers,
  updateAdminUserStatus,
  updateAdminUser,
  updateAdminUserRole,
  removeAdminUser,
};
