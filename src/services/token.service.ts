import jwt from "jsonwebtoken";
import moment from "moment";
import config from "@/config/config.js";
import type { AdminUserDoc, AdminUserType } from "@/models/admin.user.model.js";
import tokenTypes, { type ITokenTypes } from "@/config/tokens.js";
import Token from "@/models/token.model.js";
import type { PortalUserType } from "@/models/portal.user.model.js";
import ApiError from "@/utils/api-error.js";
import httpStatus from "http-status";

/**
 * Save a token
 * @param {string} token
 * @param {ObjectId} user
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted]
 * @returns {Promise<Token>}
 */
const saveToken = async (
  token: string,
  user: { userModel: string; _id: string },
  expires: moment.Moment,
  type: string,
  blacklisted = false
) => {
  const tokenDoc = await Token.create({
    token,
    user: user._id,
    userModel: user.userModel,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Generate token
 * @param {ObjectId} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */

const generateToken = (
  userId: string,
  expires: moment.Moment,
  type: string,
  secret = config.jwt.secret
) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (
  user: any,
  userModel: "Admin_User" | "Portal_User",
  includeRefresh: boolean = true
) => {
  const accessTokenExpires = moment().add(
    config.jwt.accessExpirationMinutes,
    "minutes"
  );
  const accessToken = generateToken(
    user._id.toString(),
    accessTokenExpires,
    tokenTypes.ACCESS
  );
  const refreshTokenExpires = moment().add(
    config.jwt.refreshExpirationDays,
    "days"
  );
  let refreshToken;

  if (includeRefresh) {
    refreshToken = generateToken(
      user._id.toString(),
      refreshTokenExpires,
      tokenTypes.REFRESH
    );
    await saveToken(
      refreshToken,
      { userModel: userModel, _id: user._id.toString() },
      refreshTokenExpires,
      tokenTypes.REFRESH
    );
  }
  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: includeRefresh
      ? {
          token: refreshToken,
          expires: refreshTokenExpires.toDate(),
        }
      : undefined,
  };
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (
  token: string,
  type: ITokenTypes,
  userModel: string
) => {
  const payload = jwt.verify(token, config.jwt.secret);
  const tokenDoc = await Token.findOne({
    token,
    type,
    user: payload.sub!,
    userModel,
    blacklisted: false,
  });
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Token not found");
  }
  return tokenDoc;
};

/**
 * Generate invite admin user token
 * @param {object} payload (contains role, firstName, lastName, email)
 * @returns {Promise<string>}
 */
const generateAdminUserInviteToken = async (payload: AdminUserDoc) => {
  const expiresAt = moment().add(config.jwt.acceptInviteValidityDays, "days");
  const JWTPayload = {
    ...payload,
    sub: payload._id.toString(),
    iat: moment().unix(),
    exp: expiresAt.unix(),
    type: tokenTypes.INVITE_ADMIN_USER,
  };
  const inviteToken = jwt.sign(JWTPayload, config.jwt.secret);

  await saveToken(
    inviteToken,
    { userModel: "Admin_User", _id: payload._id.toString() },
    expiresAt,
    tokenTypes.INVITE_ADMIN_USER
  );

  return inviteToken;
};

/**
 * Generate reset password token
 * @param {object} payload (contains userId, userModel)
 * @returns {Promise<string>}
 */
const generateResetPasswordToken = async (payload: {
  userId: string;
  userModel: "Admin_User" | "Portal_User";
}) => {
  const resetPasswordTokenExpires = moment().add(
    config.jwt.resetPasswordExpirationMinutes,
    "minutes"
  );
  const JWTPayload = {
    ...payload,
    sub: payload.userId,
    iat: moment().unix(),
    exp: resetPasswordTokenExpires.unix(),
    type: tokenTypes.RESET_PASSWORD,
  };

  const token = jwt.sign(JWTPayload, config.jwt.secret);
  await saveToken(
    token,
    { userModel: payload.userModel, _id: payload.userId },
    resetPasswordTokenExpires,
    tokenTypes.RESET_PASSWORD
  );
  return token;
};

/**
 * Get invite admin user token payload
 * @param {string} token (token from accept invite)
 * @returns {Promise<object>} (containing role, firstName, lastName, email...)
 */
const getPayloadFromToken = async (token: string) => {
  return jwt.verify(token, config.jwt.secret);
};

export default {
  saveToken,
  generateToken,
  verifyToken,
  generateAuthTokens,
  generateAdminUserInviteToken,
  getPayloadFromToken,
  generateResetPasswordToken,
};
