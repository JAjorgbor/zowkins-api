import tokenTypes from "@/config/tokens.js";
import tokenService from "@/services/token.service.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";
import portalUserService from "@/services/portal.user.service.js";
import Token from "@/models/token.model.js";
import emailService from "@/services/email.service.js";

const loginWithCredentials = async (
  email: string,
  password: string,
  refreshToken?: string,
) => {
  const user = await portalUserService.getPortalUser({ email }, true);
  if (!user || !(await (user as any).isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password");
  }
  if (user.status !== "active") {
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is not active");
  }
  if (refreshToken) {
    try {
      const payload = await tokenService.getPayloadFromToken(refreshToken);
      const tokenDoc = await Token.findOne({
        token: refreshToken,
        type: tokenTypes.REFRESH,
        user: payload.sub!,
        userModel: "Portal_User",
        blacklisted: false,
      });
      if (tokenDoc) await tokenDoc.deleteOne();
    } catch {
      return user;
    }
  }
  return user;
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken: string) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(
      refreshToken,
      tokenTypes.REFRESH,
      "Portal_User",
    );
    const user = await portalUserService.getPortalUser({
      _id: String(refreshTokenDoc.user),
    });
    if (!user) {
      throw new Error();
    }
    return tokenService.generateAuthTokens(user, "Portal_User", false);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate");
  }
};

const logout = async (refreshToken: string) => {
  const refreshTokenDoc = await tokenService.verifyToken(
    refreshToken,
    tokenTypes.REFRESH,
    "Portal_User",
  );
  await refreshTokenDoc.deleteOne();
};

const resetPassword = async (email: string) => {
  const user = await portalUserService.getPortalUser({ email });
  if (!user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "The email provided does not exist!",
    );
  }

  const token = await tokenService.generateResetPasswordToken({
    userId: user._id.toString(),
    userModel: "Portal_User",
  });

  await emailService.portalResetPassword({
    token,
    firstName: user.firstName,
    toEmail: email,
  });
  return true;
};

const setNewPassword = async (token: string, newPassword: string) => {
  const tokenDoc: any = await tokenService.verifyToken(
    token!,
    tokenTypes.RESET_PASSWORD,
    "Portal_User",
  );
  console.log(tokenDoc);
  const user = await portalUserService.getPortalUser({ _id: tokenDoc.user });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The user does not exist!");
  }
  // if (!user.security) {
  //   user.security = { authProvider: "credentials" };
  // }
  // user.security.password = newPassword;

  await user.save();

  await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  return user;
};

export default {
  loginWithCredentials,
  refreshAuth,
  logout,
  resetPassword,
  setNewPassword,
};
