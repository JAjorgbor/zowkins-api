import config from "@/config/config.js";
import type { PortalUserDoc } from "@/models/portal.user.model.js";
import emailVerificationService from "@/services/email-verification.service.js";
import portalAuthService from "@/services/portal.auth.service.js";
import tokenService from "@/services/token.service.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";
import httpStatus from "http-status";
import moment from "moment";

/** Issue access + refresh tokens (refresh as an httpOnly cookie) and send { user, accessToken } */
const sendAuthTokens = async (
  res: Response,
  user: PortalUserDoc,
  status: number = httpStatus.OK,
) => {
  const tokens = await tokenService.generateAuthTokens(user, "Portal_User");

  res.cookie("portalRefreshToken", tokens.refresh?.token!, {
    httpOnly: true,
    secure: config.env === "production", // only in production
    sameSite: config.env === "production" ? "none" : "lax",
    expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
  });

  res.status(status).json({
    user,
    accessToken: tokens.access.token,
  });
};

/**
 * Sign-up step 1. No account and no tokens yet: emails a code and returns a
 * verification challenge. The account is created by /verify-email.
 */
const createAccount = catchAsync(async (req: Request, res: Response) => {
  const challenge = await emailVerificationService.startSignup(req.body);
  res.status(httpStatus.ACCEPTED).json(challenge);
});

/** Sign-up step 2 (and login for unverified emails): confirm the code, then log in */
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { verificationToken, otp } = req.body;
  const user = await emailVerificationService.verifyCode(verificationToken, otp);
  await sendAuthTokens(res, user as PortalUserDoc);
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await emailVerificationService.resendCode(
    req.body.verificationToken,
  );
  res.status(httpStatus.OK).json(result);
});

const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await portalAuthService.loginWithCredentials(
    email,
    password,
    req.cookies.portalRefreshToken,
  );

  // Correct password but unverified email: no tokens until the emailed code is confirmed
  if (!user.isEmailVerified) {
    const challenge = await emailVerificationService.startLoginVerification(
      user as PortalUserDoc,
    );
    res.status(httpStatus.FORBIDDEN).json({
      code: httpStatus.FORBIDDEN,
      message: "Please verify your email to continue. We've sent you a code",
      ...challenge,
    });
    return;
  }

  await sendAuthTokens(res, user as PortalUserDoc);
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

// The emailed reset link proves the customer owns the address, so this also verifies it
const setNewPassword = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.params;

  const user = await portalAuthService.setNewPassword(
    token!,
    req.body.password!,
  );

  await sendAuthTokens(res, user as PortalUserDoc);
});

export default {
  createAccount,
  verifyEmail,
  resendOtp,
  login,
  refreshTokens,
  logout,
  resetPassword,
  setNewPassword,
};
