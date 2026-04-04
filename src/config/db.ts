import mongoose from "mongoose";
import config from "@/config/config.js";
import logger from "@/config/logger.js";

let cachedPromise: Promise<typeof mongoose> | null = null;

export async function connectDb() {
  if (!cachedPromise) {
    cachedPromise = mongoose
      .connect(config.mongoose.url, config.mongoose.options)
      .then((m) => {
        logger.info("Connected to MongoDB");
        return m;
      })
      .catch((err) => {
        cachedPromise = null; // allow retry on next invocation
        throw err;
      });
  }
  return cachedPromise;
}
