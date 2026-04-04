import httpStatus from "http-status";
import catchAsync from "@/utils/catch-async.js";
import portalUserService from "@/services/portal.user.service.js";
import type { Request, Response } from "express";

const getCustomers = catchAsync(async (req: Request, res: Response) => {
  const users = await portalUserService.getPortalUsers(req.query);
  res.send({ customers: users });
});

const getCustomer = catchAsync(async (req: Request, res: Response) => {
  const user = await portalUserService.getPortalUser({
    _id: req.params.userId!,
  });
  res.send({ customer: user });
});

const updateCustomer = catchAsync(async (req: Request, res: Response) => {
  const user = await portalUserService.updatePortalUser(
    req.params.userId!,
    req.body,
  );
  res.send({ customer: user });
});

const deleteCustomer = catchAsync(async (req: Request, res: Response) => {
  await portalUserService.deletePortalUser(req.params.userId!);
  res.status(httpStatus.NO_CONTENT).send();
});

const getNonReferralPartners = catchAsync(
  async (req: Request, res: Response) => {
    const users = await portalUserService.getPortalUsers({
      isReferralPartner: false,
    });
    res.send({ customers: users });
  },
);

const getGeneralCustomersStats = catchAsync(
  async (req: Request, res: Response) => {
    const stats = await portalUserService.getGeneralPortalUsersStats();
    res.status(200).json({ stats });
  },
);

export default {
  getCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  getNonReferralPartners,
  getGeneralCustomersStats,
};
