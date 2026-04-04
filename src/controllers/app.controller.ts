import appService from "@/services/app.service.js";
import catchAsync from "@/utils/catch-async.js";
import type { Request, Response } from "express";

const getApp = catchAsync(async (req: Request, res: Response) => {
  const app = await appService.getApp();
  res.status(200).json({ app });
});

const createApp = catchAsync(async (req: Request, res: Response) => {
  const app = await appService.createApp(req.body);
  res.status(200).json({ app });
});
const updateApp = catchAsync(async (req: Request, res: Response) => {
  const app = await appService.updateApp(req.body);
  res.status(200).json({ app });
});

export default {
  getApp,
  updateApp,
  createApp,
};
