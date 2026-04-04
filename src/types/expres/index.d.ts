import type { HydratedDocument } from "mongoose";
import type { PortalUserDoc } from "@/models/portal.user.model"; // adjust to your actual exported type
import type { AdminUserDoc } from "@/models/admin.user.model"; // adjust to your actual exported type

declare global {
  namespace Express {
    interface Request {
      portalUser?: PortalUserDoc | null;
    }
    interface Request {
      adminUser?: HydratedDocument<AdminUserDoc> | null;
    }
  }
}

export {};
