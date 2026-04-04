import passport from "passport";
import httpStatus from "http-status";
import ApiError from "@/utils/api-error.js";
import type { NextFunction, Request, Response } from "express";
import PortalUser from "@/models/portal.user.model.js";

const verifyCallback =
  (
    req: Request,
    resolve: (value?: unknown) => void,
    reject: (reason?: any) => void,
    requiredRights: ("referralPartner" | undefined)[],
  ) =>
  async (err: any, user: any, info: any) => {
    if (err || info || !user) {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "Please authenticate"),
      );
    }
    req.portalUser = user;
    const portalUser = await PortalUser.findById(user._id);

    // If user is not a portal user
    if (!portalUser) {
      return reject(
        new ApiError(
          httpStatus.UNAUTHORIZED,
          "Invalid token for portal access",
        ),
      );
    }
    if (portalUser.status !== "active") {
      return reject(
        new ApiError(httpStatus.UNAUTHORIZED, "Your account is not active"),
      );
    }

    if ((requiredRights as any[])?.[0] == "referralPartner") {
      const hasRequiredRights = portalUser.isReferralPartner;
      if (!hasRequiredRights && req.params.userId !== user.id) {
        return reject(
          new ApiError(
            httpStatus.FORBIDDEN,
            "This endpoint is only accessible to referral partners",
          ),
        );
      }
    }
    // if (requiredRights.length) {
    //   const userRights = roles.roleRights.get(user.role) || [];
    //   const hasRequiredRights = requiredRights.every((requiredRight) =>
    //     userRights.includes(requiredRight as never)
    //   );
    //   if (!hasRequiredRights && req.params.userId !== user.id) {
    //     return reject(new ApiError(httpStatus.FORBIDDEN, "Forbidden"));
    //   }
    // }

    resolve();
  };

const auth =
  (...requiredRights: ("referralPartner" | undefined)[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    return new Promise((resolve, reject) => {
      passport.authenticate(
        "jwt",
        { session: false },
        verifyCallback(req, resolve, reject, requiredRights),
      )(req, res, next);
    })
      .then(() => {
        next();
      })
      .catch((err) => next(err));
  };

export default auth;
