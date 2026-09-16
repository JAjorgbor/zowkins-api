import rateLimit, {
  ipKeyGenerator,
  type ClientRateLimitInfo,
  type Options,
  type Store,
} from "express-rate-limit";
import httpStatus from "http-status";
import config from "@/config/config.js";
import RateLimit from "@/models/rate-limit.model.js";
import ApiError from "@/utils/api-error.js";

/**
 * express-rate-limit store backed by the Rate_Limit collection, so limits hold
 * across server instances, restarts and serverless invocations. Each key is a
 * fixed window that starts on its first hit.
 */
class MongoStore implements Store {
  localKeys = false;
  prefix: string;
  private windowMs = 60_000;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private prefixed(key: string) {
    return `${this.prefix}${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = new Date();
    const windowActive = { $gt: ["$resetAt", now] };
    // One atomic update: count the hit, or start a new window if the old one ended
    // (a missing resetAt on a fresh upsert compares as not active)
    const update = [
      {
        $set: {
          hits: { $cond: [windowActive, { $add: ["$hits", 1] }, 1] },
          resetAt: {
            $cond: [
              windowActive,
              "$resetAt",
              new Date(now.getTime() + this.windowMs),
            ],
          },
        },
      },
    ];
    const run = () =>
      RateLimit.collection.findOneAndUpdate(
        { key: this.prefixed(key) },
        update,
        { upsert: true, returnDocument: "after" },
      );

    let doc;
    try {
      doc = await run();
    } catch (error: any) {
      // Two first hits for the same key raced on the unique index; the retry updates
      if (error?.code !== 11000) throw error;
      doc = await run();
    }
    return { totalHits: doc?.hits ?? 1, resetTime: doc?.resetAt };
  }

  async decrement(key: string) {
    await RateLimit.collection.updateOne(
      { key: this.prefixed(key), hits: { $gt: 0 } },
      { $inc: { hits: -1 } },
    );
  }

  async resetKey(key: string) {
    await RateLimit.collection.deleteOne({ key: this.prefixed(key) });
  }
}

type LimiterOptions = {
  /** Unique per limiter; namespaces its counters */
  name: string;
  windowMs: number;
  limit: number;
  message: string;
  /** Only count failed requests (e.g. wrong passwords) */
  skipSuccessfulRequests?: boolean;
};

const MINUTE = 60 * 1000;

const createRateLimiter = ({
  name,
  windowMs,
  limit,
  message,
  skipSuccessfulRequests = false,
}: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    skipSuccessfulRequests,
    store: new MongoStore(`${name}:`),
    // Sends RateLimit / RateLimit-Policy headers, plus Retry-After when blocked
    standardHeaders: "draft-8",
    // Policy name shown in those headers, e.g. RateLimit: "checkout"; r=0; t=3540
    identifier: name,
    legacyHeaders: false,
    // req.ip honours the "trust proxy" setting in app.ts (Render). On Netlify,
    // req.clientIp is set from the header Netlify controls (netlify/functions/api.ts).
    // ipKeyGenerator groups IPv6 clients by subnet so they can't rotate addresses.
    keyGenerator: (req) => ipKeyGenerator(req.clientIp ?? req.ip ?? "unknown"),
    // How far X-Forwarded-For is trusted is set explicitly by TRUST_PROXY, so skip the library's guess
    validate: { xForwardedForHeader: false },
    // If the counter store is unreachable, let requests through rather than
    // taking checkout and login down with it
    passOnStoreError: true,
    skip: () => config.env === "test",
    handler: (_req, _res, next) =>
      next(new ApiError(httpStatus.TOO_MANY_REQUESTS, message)),
  });

/** Order placement; public for guests, so it can create customer records */
export const checkoutLimiter = createRateLimiter({
  name: "checkout",
  windowMs: 60 * MINUTE,
  limit: 20,
  message: "Too many orders from this network. Please try again later",
});

/** Quote requests; public, upload a file to R2 and email admins */
export const quoteLimiter = createRateLimiter({
  name: "quote",
  windowMs: 60 * MINUTE,
  limit: 10,
  message: "Too many quote requests from this network. Please try again later",
});

/** Failed logins only; a successful login doesn't use up attempts */
export const portalLoginLimiter = createRateLimiter({
  name: "portal-login",
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many failed login attempts. Please try again in 15 minutes",
});

export const adminLoginLimiter = createRateLimiter({
  name: "admin-login",
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many failed login attempts. Please try again in 15 minutes",
});

export const signupLimiter = createRateLimiter({
  name: "signup",
  windowMs: 60 * MINUTE,
  limit: 10,
  message: "Too many accounts created from this network. Please try again later",
});

/** Each request sends an email, so this is the strictest */
export const passwordResetLimiter = createRateLimiter({
  name: "password-reset",
  windowMs: 60 * MINUTE,
  limit: 5,
  message: "Too many password reset requests. Please try again later",
});
