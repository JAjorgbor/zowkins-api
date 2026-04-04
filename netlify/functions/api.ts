import serverless from "serverless-http";
import app from "../../src/app.js";
import { connectDb } from "../../src/config/db.js";

const expressHandler = serverless(app);

export const handler = async (event: any, context: any) => {
  await connectDb();
  return expressHandler(event, context);
};
