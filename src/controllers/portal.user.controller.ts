import portalUserService from "@/services/portal.user.service.js";
import httpStatus from "http-status";
import ApiError from "@/utils/api-error.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";

const getPortalUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.portalUser._id.toString();
  const portalUser = await portalUserService.getPortalUser({ _id: userId });

  if (!portalUser)
    throw new ApiError(httpStatus.NOT_FOUND, "Portal user not found");
  res.status(200).json(portalUser);
});

const updatePortalUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.portalUser._id.toString();
  const portalUser = await portalUserService.updatePortalUser(userId, req.body);

  res.status(httpStatus.OK).json(portalUser);
});

const updatePortalUserPassword = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.portalUser._id.toString();
    const portalUser = await portalUserService.updatePortalUserPassword(
      userId,
      req.body,
    );
    res.status(httpStatus.OK).json(portalUser);
  },
);

export default { getPortalUser, updatePortalUser, updatePortalUserPassword };
