import AdminUser, {
  type AdminUserDoc,
  type AdminUserType,
} from "@/models/admin.user.model.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";

const getAdminUser = async (
  filterParams: Partial<AdminUserType & { _id: string }>,
  includePassword?: boolean,
) => {
  return await AdminUser.findOne(filterParams).select(
    includePassword ? "+password" : "",
  );
};

const createAdminUser = async (userBody: any) => {
  if (await (AdminUser as any).isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }

  // create security object
  const security = {
    password: userBody.password,
  };
  userBody.security = security;

  return await AdminUser.create(userBody);
};

const updateAdminUser = async (userId: any, updateBody: any) => {
  const user = await getAdminUser({ _id: userId });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin user not found");
  }
  if (
    updateBody.email &&
    (await (AdminUser as any).isEmailTaken(updateBody.email, userId))
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const updateAdminUserPassword = async (
  userId: string,
  {
    currentPassword,
    newPassword,
  }: {
    currentPassword: string;
    newPassword: string;
  },
) => {
  const user = await getAdminUser({ _id: userId }, true);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin User not found");
  }
  if (!user || !(await (user as any).isPasswordMatch(currentPassword))) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Current password is incorrect");
  }
  user.password = newPassword;
  await user.save();
  return user;
};

export default {
  createAdminUser,
  updateAdminUser,
  getAdminUser,
  updateAdminUserPassword,
};
