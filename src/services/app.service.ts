import App from "@/models/app.model.js";

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

export default {
  createApp,
  getApp,
  updateApp,
};
