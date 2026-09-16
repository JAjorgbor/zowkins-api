---
name: auth-and-permissions
description: Authentication and authorization in the Zowkins API, covering JWT access/refresh tokens, the separate admin and portal (customer) auth middlewares, optional auth for guest-accessible endpoints, ownership checks, and admin role permissions. Use when protecting a route, adding a permission or role, or handling tokens and cookies.
---

# Authentication and permissions

## Two user types, one JWT strategy

- `Admin_User` (staff, `src/models/admin.user.model.ts`), routes under `/v1/admin/*`
- `Portal_User` (customers, `src/models/portal.user.model.ts`), routes under `/v1/portal/*`

`src/config/passport.ts` verifies the access token and looks the `sub` up in **Admin_User first, then Portal_User**. Each middleware then checks that the user is the right kind, so an admin token is rejected on portal routes and the reverse.

## Tokens

- **Access token:** JWT (`type: "access"`), sent as `Authorization: Bearer <token>`. Lifetime is `JWT_ACCESS_EXPIRATION_MINUTES`. It is not stored in the DB.
- **Refresh token:** JWT stored in the `Token` collection. It is set as an **httpOnly cookie**: `portalRefreshToken` for customers and `adminRefreshToken` for staff. `POST .../refresh-tokens` reads the cookie and returns `{ accessToken }`. Frontends must send requests with `credentials: "include"` for the cookie to travel.
- **Reset-password / invite tokens:** JWTs stored in `Token` with a `userModel`, checked with `tokenService.verifyToken(token, type, userModel)`.
- Token types live in `src/config/tokens.ts`.

## Middlewares

### Admin: `src/middlewares/admin-auth.ts`
```ts
router.get("/", auth("getOrders"), ...)      // requires the permission
router.patch("/me", auth(), ...)             // any active admin
```
Sets `req.adminUser`. Rejects inactive admins. Permissions are checked against `roles.roleRights` for the admin's `role`. The check also passes when `req.params.userId` equals the admin's own id.

### Portal (customers): `src/middlewares/portal-auth.ts`
```ts
import portalAuth, { optionalAuth, requireSelf } from "@/middlewares/portal-auth.js";

router.get("/me", portalAuth(), ...)                       // must be logged in
router.get("/:userId", portalAuth(), requireSelf(), ...)   // must be logged in AND :userId must be themself
router.post("/", optionalAuth(), ...)                      // guest or logged in
```
- `portalAuth()` sets `req.portalUser` and rejects inactive users. `portalAuth("referralPartner")` also requires `isReferralPartner`.
- `optionalAuth()`: with no `Authorization` header, the request continues with `req.portalUser` unset. With a header, the token **must** be valid: a bad or expired token returns 401 and is never silently treated as a guest. In the controller, branch on `if (req.portalUser)`.
- `requireSelf()`: 403 unless `req.params.userId` matches the logged-in user. Use it on every portal route that takes a `:userId`. Portal routes with a user id and no ownership check let any caller read or edit other customers' data (this happened to `/portal/delivery-address` before it was fixed).

**Rule:** on portal routes, the acting customer is `req.portalUser`, never an id from the request body.

## Admin roles and permissions (`src/config/roles.ts`)

Roles: `devOps`, `administrator`, `operations`, `storeManager`, `marketingAndSales`, `accountant`, `driver`. Each maps to a list of permission strings (`getOrders`, `manageOrders`, `getUsers`, `manageCustomers`, `getInventory`, `updateInventory`, `updateApp`, ...).

To add a permission:
1. Add the string to every role that should have it in `adminUserRoles`. The `AdminUserPermissions` type is derived from these lists, so `auth("newPermission")` won't typecheck until at least one role has it.
2. Use it in the route: `auth("newPermission")`.
3. Tell the admin frontend: the UI usually hides actions based on role.

## Rate limiting (`src/middlewares/rate-limit.ts`)

Public endpoints that are costly or open to abuse get a limiter as the **first** middleware, before auth and validation, so rejected spam never reaches the DB or the email provider:

```ts
router.post("/", checkoutLimiter, optionalPortalAuth(), validate(...), controller)
```

Current limiters: `checkoutLimiter`, `quoteLimiter`, `portalLoginLimiter` / `adminLoginLimiter` (count failures only), `signupLimiter`, `passwordResetLimiter` (shared by portal and admin). To add one, call `createRateLimiter({ name, windowMs, limit, message })` in that file. `name` must be unique because it prefixes the counters.

How it works, and why:
- **Counters live in MongoDB** (`Rate_Limit` model, TTL index on `resetAt`), so they survive restarts and are shared between instances. In-memory counters would reset and diverge. The store does one atomic pipeline `findOneAndUpdate` per hit, which was tested under 30 concurrent requests.
- **Client IP** is the key, and getting it wrong is dangerous: if every request looks like it comes from the proxy, *all visitors share one bucket* (e.g. 20 checkouts per hour for the whole site).
  - **Render (sandbox):** `app.set("trust proxy", config.trustProxy)` in `src/app.ts`. `TRUST_PROXY` is the number of proxy hops. It defaults to `1` when Render's `RENDER` env var is present, else `0`. Express then takes `req.ip` from the right end of `X-Forwarded-For`, which the proxy appends, so a client can't spoof it by sending its own header. **Never set `trust proxy` to `true`**: that trusts the whole header, which clients control.
  - **Netlify:** `netlify/functions/api.ts` sets `req.clientIp` from `x-nf-client-connection-ip`, which Netlify sets itself. The key generator prefers `req.clientIp` over `req.ip`.
  - **Verify after any hosting change:** call `GET /v1/test/ip` from two different networks (e.g. wifi and mobile data). If both show the same address, increase `TRUST_PROXY`. You can also inspect keys in the `rate_limits` collection (`<limiter>:<ip>`).
- Blocked requests go through `ApiError(429)`, so they keep the `{ code, message }` shape. `RateLimit`, `RateLimit-Policy` and `Retry-After` are exposed through CORS in `src/app.ts`.
- `passOnStoreError: true`: if MongoDB is unreachable, requests are allowed rather than failing.
- Limiters are **skipped when `NODE_ENV=test`**. To test one, run with `NODE_ENV=development` against a local database.

## Route ordering gotcha

Define static paths (`/stats`, `/recent`, `/non-referral-partners`) **before** parameter paths (`/:orderId`) in the same router, or Express matches the parameter route first.
