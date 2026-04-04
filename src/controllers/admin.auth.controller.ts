import config from "@/config/config.js";
import adminAuthService from "@/services/admin.auth.service.js";
import adminUserService from "@/services/admin.user.service.js";
import tokenService from "@/services/token.service.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import moment from "moment";

const createAccountWithCredentials = catchAsync(
  async (req: Request, res: Response) => {
    const user = await adminUserService.createAdminUser(req.body);

    const tokens = await tokenService.generateAuthTokens(user, "Admin_User");
    res.cookie("adminRefreshToken", tokens.refresh?.token!, {
      httpOnly: true,
      secure: config.env === "production", // only in production
      sameSite: config.env === "production" ? "none" : "lax",
      expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
    });

    res.status(httpStatus.CREATED).json({
      user,
      accessToken: tokens.access.token,
    });
  }
);
const loginWithCredentials = catchAsync(async (req: Request, res: Response) => {
  const user = await adminAuthService.loginWithCredentials(
    req.body.email,
    req.body.password,
    req.cookies.adminRefreshToken
  );

  const tokens = await tokenService.generateAuthTokens(user, "Admin_User");
  res.cookie("adminRefreshToken", tokens.refresh?.token!, {
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

const refreshTokens = catchAsync(async (req: Request, res: Response) => {
  const tokens = await adminAuthService.refreshAuth(
    req.cookies.adminRefreshToken
  );
  res.send({ accessToken: tokens.access.token });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  await adminAuthService.logout(req.cookies.adminRefreshToken);
  res.clearCookie("adminRefreshToken");
  res.send({ message: "Logged out" });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await adminAuthService.resetPassword(req.body.email!);

  res.status(httpStatus.NO_CONTENT).send();
});

const setNewPassword = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params;

  const user = await adminAuthService.setNewPassword(
    token!,
    req.body.password!
  );

  const tokens = await tokenService.generateAuthTokens(user, "Admin_User");

  res.cookie("adminRefreshToken", tokens.refresh?.token!, {
    httpOnly: true,
    secure: config.env === "production",
    sameSite: config.env === "production" ? "none" : "lax",
    expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
  });

  res.status(httpStatus.OK).json({
    user,
    accessToken: tokens.access.token,
  });
});

export default {
  createAccountWithCredentials,
  refreshTokens,
  loginWithCredentials,
  logout,
  resetPassword,
  setNewPassword,
};
