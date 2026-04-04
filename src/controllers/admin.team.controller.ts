import httpStatus from "http-status";

import ApiError from "@/utils/api-error.js";
import catchAsync from "@/utils/catch-async.js";
import adminTeamService from "@/services/admin.team.service.js";
import emailService from "@/services/email.service.js";
import adminUserService from "@/services/admin.user.service.js";
import tokenService from "@/services/token.service.js";
import type { Request, Response } from "express";
import config from "@/config/config.js";
import { Types } from "mongoose";
import moment from "moment";
import Token from "@/models/token.model.js";
import tokenTypes from "@/config/tokens.js";

const getAdminUsers = catchAsync(async (req: Request, res: Response) => {
  const AdminUsers = await adminTeamService.getAdminUsers();
  res.send(AdminUsers);
});

const updateAdminUserStatus = catchAsync(
  async (req: Request, res: Response) => {
    await adminTeamService.updateAdminUserStatus(
      req.params.id!,
      req.body.status
    );
    res.status(httpStatus.NO_CONTENT).send();
  }
);

const updateAdminUserRole = catchAsync(async (req: Request, res: Response) => {
  await adminTeamService.updateAdminUserRole(req.params.id!, req.body.role);
  res.status(httpStatus.NO_CONTENT).send();
});

const adminUserInvite = catchAsync(async (req: Request, res: Response) => {
  // check if user with email already exists
  const user = await adminUserService.getAdminUser({ email: req.body.email });
  if (user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "The email provided already exists!"
    );
  }

  const { email, firstName } = req.body;
  const adminUser = await adminUserService.createAdminUser({
    ...req.body,
    status: "pending",
  });
  const token = await tokenService.generateAdminUserInviteToken(
    adminUser as any
  );

  await emailService.adminUserInvite({
    token,
    firstName,
    toEmail: email,
  });

  res.status(httpStatus.NO_CONTENT).send();
});

const resendAdminUserInvite = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await adminUserService.getAdminUser({ _id: id! });
    if (!user) {
      throw new ApiError(404, "Admin user not found");
    }
    if (user.status == "active") {
      throw new ApiError(500, "Admin user already active");
    }

    await Token.deleteMany({
      user: user._id,
      type: tokenTypes.INVITE_ADMIN_USER,
    });
    const token = await tokenService.generateAdminUserInviteToken(user as any);
    await emailService.adminUserInvite({
      token,
      firstName: user.firstName,
      toEmail: user.email!,
    });

    res.status(httpStatus.NO_CONTENT).send();
  }
);

const updateAdminUser = catchAsync(async (req: Request, res: Response) => {
  await adminUserService.updateAdminUser(req.params.id, req.body);
  res.send();
});

const acceptInvite = catchAsync(async (req: Request, res: Response) => {
  const token = req.params.token;
  const { password } = req.body;

  const { user, tokens } = await adminTeamService.acceptInvite(
    token!,
    password
  );

  res.cookie("adminRefreshToken", tokens.refresh?.token!, {
    httpOnly: true,
    secure: config.env === "production", // only in production
    sameSite: config.env === "production" ? "strict" : "lax",
    expires: moment().add(config.jwt.refreshExpirationDays, "days").toDate(),
  });
  res.send({ user, accessToken: tokens.access.token });
});

const removeAdminUser = catchAsync(async (req: Request, res: Response) => {
  await adminTeamService.removeAdminUser(req.params.id!);
  res.send();
});

export default {
  getAdminUsers,
  updateAdminUserStatus,
  adminUserInvite,
  acceptInvite,
  updateAdminUser,
  removeAdminUser,
  resendAdminUserInvite,
  updateAdminUserRole,
};
