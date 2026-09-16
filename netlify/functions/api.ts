import serverless from "serverless-http";
import app from "../../src/app.js";
import { connectDb } from "../../src/config/db.js";

const expressHandler = serverless(app, {
  // Netlify sets x-nf-client-connection-ip itself (clients can't override it),
  // unlike X-Forwarded-For. Rate limiting keys on this.
  request: (req: any, event: any) => {
    const headers = event.headers ?? {};
    const clientIp =
      headers["x-nf-client-connection-ip"] ?? headers["X-Nf-Client-Connection-Ip"];
    if (clientIp) req.clientIp = String(clientIp).split(",")[0]!.trim();
  },
});

export const handler = async (event: any, context: any) => {
  await connectDb();
  return expressHandler(event, context);
};
