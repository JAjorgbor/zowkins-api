import App from "@/models/app.model.js";
import { handleAssetUpload } from "@/utils/upload-asset.js";
import customValidation from "@/validation/custom.validation.js";
import type { Request } from "express";

const createApp = async (payload: any) => {
  const existingApp = await App.findOne();
  if (existingApp) {
    throw new Error("App already exists");
  }

  const app = await App.create(payload);
  return app;
};

const getApp = async () => {
  const app = await App.findOne();
  return app;
};

const updateApp = async (payload: any) => {
  const app = await App.findOne();
  if (!app) {
    throw new Error("App not found");
  }

  app.set(payload);
  await app.save();
  return app;
};

const uploadHeroImage = async (req: Request) => {
  const app = await App.findOne();
  if (!app) {
    throw new Error("App not found");
  }

  const { file: image } = await handleAssetUpload(req, `app/hero-image.jpg`, {
    file: customValidation.fileSchema,
    maxFiles: 1,
    requireFile: true,
  });

  app.set({ heroImage: image });
  await app.save();
  return app;
};

export default {
  createApp,
  getApp,
  updateApp,
  uploadHeroImage,
};
