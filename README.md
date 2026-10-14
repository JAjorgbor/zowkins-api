# Zowkins API

Backend for the Zowkins online store. It serves two frontends:

- **Storefront / customer portal**: browse the catalogue, check out and pay with Paystack (with or without an account), request quotes for items not in the catalogue, manage a profile and saved delivery addresses, and track orders.
- **Admin console**: staff manage products, categories, delivery methods, orders (including payment links), customers, store settings and the admin team, with role-based permissions.

Built with Node.js, Express, MongoDB (Mongoose) and TypeScript. The sandbox API runs on Render (`https://zowkins-api.onrender.com`). A Netlify Functions entry point is also kept in the repo.

> This codebase started from the PharmaHub Medica API. One leftover remains: the default `slug` on the App model (`pharmahubmedica-app`). SendPulse email template ids should also be checked against the Zowkins SendPulse account.

## 📚 Documentation

- [API Architecture](./docs/ARCHITECTURE.md): the Route → Controller → Service pattern and validation.
- [Frontend Update Guide](./docs/FRONTEND_UPDATE_GUIDE.md): what the storefront and admin console need to change for customer accounts, guest orders linked by email, the security fixes and rate limits.
- **Swagger UI:** `GET /v1/docs` on a running server (e.g. <http://localhost:5500/v1/docs>).
- **Agent skills** in [`.claude/skills/`](./.claude/skills/): working notes on project patterns (adding endpoints, auth and rate limiting, customer accounts and guest orders, disabled modules).

## 🧩 Modules

All routes are prefixed with `/v1`.

| Area | Base path | Who | What it does |
| --- | --- | --- | --- |
| Store settings | `/app` | public read, admin write | Store name, contacts, branding, portal status |
| Catalogue | `/categories`, `/products` | public | Categories with subcategories, products by slug |
| Delivery methods | `/delivery-methods` | public | Available delivery options and fees |
| Customer auth | `/portal/auth` | public | Sign up and login with mandatory email verification (6-digit code), resend code, refresh token (httpOnly cookie), logout, password reset |
| Customer profile | `/portal/users/me` | customer | View/update profile, change password |
| Delivery addresses | `/portal/delivery-address/:userId` | customer (own only) | Saved address book |
| Orders | `/portal/orders` | **guest or customer** | Checkout (optionally returns a Paystack payment link), order history, recent orders, stats |
| Quotes | `/portal/orders/quote` | **guest or customer** | Request a quote for items with an optional file (multipart), emailed to staff |
| Payments | `/payment/paystack/webhook` | Paystack | Verifies signed Paystack events and updates order payment status |
| Admin auth & profile | `/admin/auth`, `/admin/users` | staff | Login, password reset, own profile |
| Admin team | `/admin/team` | staff | Invite, update, remove staff and assign roles |
| Catalogue management | `/admin/categories`, `/admin/products` | staff | CRUD; product images are uploaded to Cloudflare R2 |
| Delivery method management | `/admin/delivery-methods` | staff | CRUD |
| Order management | `/admin/orders` | staff | Create orders, list/filter, update status and payment status, edit items, generate payment links, stats |
| Customer management | `/admin/customers` | staff | List/filter (incl. guest vs registered), update, delete, addresses, stats |

Order, quote, payment, cancellation and delivery emails go to customers and to staff with the `manageOrders` permission.

### Email verification

Customers must verify their email with a 6-digit code before they get an access token. Sign-up (`create-account`) creates nothing and returns a `verificationToken`; `verify-email` with that token and the emailed code creates the account and logs in. Logging in with an unverified email returns 403 with a new `verificationToken` and emails a code. Codes are stored hashed, allow 5 attempts, expire after `JWT_VERIFY_OTP_EXPIRATION_MINUTES`, and can be resent once a minute (up to 4 times). Implementation: `src/services/email-verification.service.ts`. Frontend flow: [Frontend Update Guide, section 1b](./docs/FRONTEND_UPDATE_GUIDE.md#1b-email-verification-one-time-code-mandatory).

### Customer accounts and guest orders

Customers can order or request quotes without an account. Their details are saved as a **guest customer**, keyed by email. When that email later signs up (or completes a password reset), the guest record becomes the account, and every earlier order and quote shows up in it. Details: [`.claude/skills/customer-accounts`](./.claude/skills/customer-accounts/SKILL.md).

### Rate limiting

Checkout, quote requests, login, sign-up, email verification (verify and resend) and password reset are rate-limited per client IP and return `429` when a limit is exceeded. Counters are stored in MongoDB (`rate_limits` collection, expired automatically), so limits survive restarts and are shared between instances. Limits are defined in `src/middlewares/rate-limit.ts` and are disabled when `NODE_ENV=test`.

The client IP depends on the `TRUST_PROXY` setting (see below). After deploying, call `GET /v1/test/ip` from two different networks. They should show different addresses; if they show the same one, adjust `TRUST_PROXY`.

### Disabled modules

**Referral partners** (commission for customers who refer others) and **bank lookups** are implemented but switched off: their routes aren't registered and their docs are excluded. See [`.claude/skills/disabled-modules`](./.claude/skills/disabled-modules/SKILL.md) for how to re-enable them.

## 🛠️ Technology stack

- **Runtime / framework:** Node.js, Express 4, TypeScript (ESM)
- **Database:** MongoDB via Mongoose
- **Validation:** Zod
- **Auth:** JWT access tokens + refresh tokens in httpOnly cookies (Passport JWT), role-based permissions for staff
- **Payments:** Paystack (transaction links + signed webhook)
- **File storage:** Cloudflare R2 (S3 API)
- **Email:** SendPulse templates
- **Rate limiting:** express-rate-limit with a MongoDB-backed store
- **API docs:** Swagger / OpenAPI 3 (YAML files in `src/docs/v1`)
- **Hosting:** Render (`pnpm build` then `pnpm start`); `netlify/functions/api.ts` wraps the app for Netlify Functions

## 🚀 Getting started

Requirements: Node.js 20+, pnpm, and a MongoDB database.

```bash
pnpm install
pnpm run dev          # nodemon + tsx, watches src/
```

Other scripts:

```bash
pnpm run build        # compile to dist/
pnpm start            # run the compiled server (used on Render)
pnpm run netlify:dev  # run through the Netlify CLI
npx tsc --noEmit      # typecheck
```

### Environment variables

Create a `.env` file in the project root. The server refuses to start if a required variable is missing (see `src/config/config.ts`).

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | yes | `development`, `production` or `test` |
| `PORT` | no | default `5500` |
| `BASE_URL` | yes | public URL of this API (shown in Swagger) |
| `WEBSITE_URL` | yes | frontend base URL, used in email links |
| `DATABASE_URL`, `DATABASE_NAME` | yes | MongoDB connection string and database name |
| `JWT_SECRET` | yes | |
| `JWT_ACCESS_EXPIRATION_MINUTES` | no | default 30 |
| `JWT_REFRESH_EXPIRATION_DAYS` | no | default 30 |
| `JWT_RESET_PASSWORD_EXPIRATION_MINUTES`, `JWT_VERIFY_EMAIL_EXPIRATION_MINUTES`, `JWT_VERIFY_OTP_EXPIRATION_MINUTES`, `JWT_UPDATE_EMAIL_EXPIRATION_MINUTES` | no | default 10 |
| `JWT_ACCEPT_INVITE_VALIDITY_DAYS` | no | default 10 |
| `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_ENDPOINT`, `R2_PUBLIC_URL` | yes | Cloudflare R2 for product images, quote files and avatars |
| `SMTP_CLIENT_ID`, `SMTP_CLIENT_SECRET` | yes | SendPulse API credentials |
| `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS` | yes | sender identity |
| `PAYSTACK_SECRET_KEY` | yes | Paystack secret key (payment links and webhook signature check) |
| `EMAIL_VERIFY_OTP_TEMPLATE_ID` | **yes for sign-up/login to work** | SendPulse template id of the "verify your email" code email (variables `firstName`, `otp`, `expirationInMinutes`). The server starts without it, but sign-up and unverified logins return 503 until it is set |
| `JWT_VERIFY_OTP_EXPIRATION_MINUTES` | no | how long each verification code is valid (default 10) |
| `TRUST_PROXY` | no | number of reverse proxies in front of the API, used to read the client IP. Defaults to `1` on Render (detected from Render's `RENDER` variable) and `0` elsewhere |

### Errors

Errors are returned as `{ "code": <http status>, "message": "<text>" }`. Validation failures return 400 with the failing fields, e.g. `"customer.email: Invalid email address"`. Rate-limited requests return 429 with a `Retry-After` header.
