import config from "@/config/config.js";
import portalAuthService from "@/services/portal.auth.service.js";
import portalUserService from "@/services/portal.user.service.js";
import tokenService from "@/services/token.service.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import moment from "moment";

const createAccount = catchAsync(async (req: Request, res: Response) => {
  const user = await portalUserService.createPortalUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user, "Portal_User");

  res.cookie("portalRefreshToken", tokens.refresh?.token!, {
    httpOnly: true,
    secure: config.env === "production", // only in production
    sameSite: config.env === "production" ? "none" : "lax",
    expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
  });

  res.status(httpStatus.CREATED).json({
    user,
    accessToken: tokens.access.token,
  });
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await portalAuthService.loginWithCredentials(
    email,
    password,
    req.cookies.portalRefreshToken,
  );
  const tokens = await tokenService.generateAuthTokens(user, "Portal_User");

  res.cookie("portalRefreshToken", tokens.refresh?.token!, {
    httpOnly: true,
    secure: config.env === "production", // only in production
    sameSite: config.env === "production" ? "none" : "lax",
    expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
  });

  res.status(httpStatus.OK).json({
    user,
    accessToken: tokens.access.token,
  });
});

const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const tokens = await portalAuthService.refreshAuth(
    req.cookies.portalRefreshToken,
  );
  res.send({ accessToken: tokens.access.token });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await portalAuthService.logout(req.cookies.portalRefreshToken);
  res.clearCookie("portalRefreshToken");
  res.send({ message: "Logged out" });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await portalAuthService.resetPassword(req.body.email!);

  res.status(httpStatus.NO_CONTENT).send();
});

const setNewPassword = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params;

  const user = await portalAuthService.setNewPassword(
    token!,
    req.body.password!,
  );

  const tokens = await tokenService.generateAuthTokens(user, "Portal_User");

  res.cookie("portalRefreshToken", tokens.refresh?.token!, {
    httpOnly: true,
    secure: config.env === "production", // only in production
    sameSite: config.env === "production" ? "none" : "lax",
    expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
  });

  res.status(httpStatus.OK).json({
    user,
    accessToken: tokens.access.token,
  });
});

export default {
  createAccount,
  login,
  refreshTokens,
  logout,
  resetPassword,
  setNewPassword,
};
