import express, { type Application } from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";

import routes from "@/routes/v1/index.js";
import sanitizeXSS from "@/middlewares/sanitizeXSS.js";
import ExpressMongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import { errorConverter, errorHandler } from "@/middlewares/error.js";
import passport from "passport";
import jwtStrategy from "@/config/passport.js";
import config from "@/config/config.js";

const app: Application = express();

/**
 * 1️⃣ Disable caching for ALL API responses
 *    (critical on Netlify / serverless + CORS)
 */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Origin"); // keep responses origin-safe
  next();
});

/** Explicit origins (local/dev, etc.) */
const explicitAllowedOrigins = new Set<string>([
  "http://localhost:3000",
  "http://localhost:3001",
  `http://localhost:${config.port}`,
  "https://zowkins-api.onrender.com",
  "https://zowkins.vercel.app",
]);

/** Allow root + any subdomain that ends with .zowkins.com */
function isAllowedOrigin(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "zowkins.com" ||
      hostname === "www.zowkins.com" ||
      hostname.endsWith(".zowkins.com") ||
      hostname === "zowkins.ng" ||
      hostname.endsWith(".zowkins.ng") ||
      hostname === "zowkins-api.onrender.com" ||
      hostname === "zowkins.vercel.app"
    );
  } catch {
    return false;
  }
}

function isWhitelisted(origin: string) {
  return explicitAllowedOrigins.has(origin) || isAllowedOrigin(origin);
}

/**
 * IMPORTANT:
 * - With credentials:true you cannot use "*" for Access-Control-Allow-Origin.
 * - Preflight must get CORS headers, so CORS must run BEFORE routes/middlewares that may short-circuit.
 */
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // allow server-to-server / Postman / curl
    if (!origin) return callback(null, true);

    if (isWhitelisted(origin)) return callback(null, true);

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => {
  // make caches keep per-origin variants
  res.setHeader("Vary", "Origin");
  next();
});

// ✅ Handle preflight early for all routes
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

/* Middleware (after CORS) */
app.use(logger("dev"));
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// set security HTTP headers
app.use(helmet());

// sanitize request data
app.use(sanitizeXSS());
app.use(ExpressMongoSanitize());

// jwt authentication
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);

// gzip compression
app.use(compression());

/* Routes */
app.use("/v1", routes);

// Convert any thrown errors to ApiError
app.use(errorConverter);

// Send the formatted error response
app.use(errorHandler);

export default app;
