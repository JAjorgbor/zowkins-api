import passport from "passport";

import httpStatus from "http-status";
import ApiError from "@/utils/api-error.js";
import roles, { type AdminUserPermissions } from "@/config/roles.js";
import type { NextFunction, Request, Response } from "express";
import AdminUser from "@/models/admin.user.model.js";

const verifyCallback =
  (
    req: Request,
    resolve: (value?: unknown) => void,
    reject: (reason?: any) => void,
    requiredRights: AdminUserPermissions[]
  ) =>
  async (err: any, user: any, info: any) => {
    if (err || info || !user) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate")
      );
    }
    req.adminUser = user;
    const adminUser = await AdminUser.findById(user._id);

    // If user is not an admin user
    if (!adminUser) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "Invalid token for admin access")
      );
    }
    if (adminUser.status !== "active") {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "Your account is not active")
      );
    }

    if (requiredRights.length) {
      const userRights = roles.roleRights.get(user.role) || [];
      const hasRequiredRights = requiredRights.every((requiredRight) =>
        userRights.includes(requiredRight as never)
      );
      if (!hasRequiredRights && req.params.userId !== user.id) {
        return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden"));
      }
    }

    resolve();
  };

const auth =
  (...requiredRights: AdminUserPermissions[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, resolve, reject, requiredRights)
      )(req, res, next);
    })
      .then(() => {
        next();
      })
      .catch((err) => next(err));
  };

export default auth;
