---
name: add-api-endpoint
description: Add or change a REST endpoint in the Zowkins API (Express + Mongoose + Zod + Swagger YAML). Use when creating a route, controller, service, validation schema or OpenAPI doc, or when changing a request/response contract. Covers file layout, import conventions, error handling, response shapes and how to verify the change.
---

# Adding or changing an API endpoint

The API is layered **route → validation → controller → service → model**. Every layer has a fixed place and naming scheme. Read one existing module end to end before writing a new one. `portal.order.*` and `admin.customer.*` are good references.

## File map (one module = up to 6 files)

| Layer | Path | Naming |
| --- | --- | --- |
| Route | `src/routes/v1/<audience>.<module>.route.ts` | `audience` = `portal` (customers), `admin` (staff), or none (public) |
| Validation | `src/validation/<audience>.<module>.validation.ts` | object of `{ params?, query?, body? }` Zod schemas |
| Controller | `src/controllers/<audience>.<module>.controller.ts` | handlers wrapped in `catchAsync` |
| Service | `src/services/<module>.service.ts` | usually shared by portal + admin controllers |
| Model | `src/models/<module>.model.ts` | Mongoose schema; export `XType` / `XDoc` types |
| Docs | `src/docs/v1/<audience>.<module>.doc.yml` | OpenAPI 3 YAML, auto-globbed |

Register every new router in `src/routes/v1/index.ts` (`defaultRoutes` array). Everything is mounted under `/v1`. Swagger UI is served at `/v1/docs`.

## Conventions that are easy to get wrong

- **Imports** use the `@/` alias and a **`.js` extension**, even for `.ts` files (`import x from "@/services/order.service.js"`). The project is ESM (`"type": "module"`, `module: nodenext`), so a missing `.js` breaks at runtime.
- **Type-only imports** must use `import type` / `type` specifiers (`verbatimModuleSyntax`).
- **`exactOptionalPropertyTypes` is on.** You cannot pass `{ lastName: undefined }` where Mongoose expects `string | null`. Omit the key (`...(v !== undefined && { key: v })`) or coalesce to `null`.
- **Never spread a Mongoose document** (`{...doc}` copies `$__`/`_doc` internals). Read fields explicitly or call `doc.toObject()`.
- **Errors:** throw `new ApiError(httpStatus.X, "message")` from services or controllers. `catchAsync` forwards the error, and `src/middlewares/error.ts` formats it as `{ code, message }`. Only `ApiError`s keep their message in production. Anything else becomes a 500 "Internal Server Error".
- **Validation middleware** (`validate(schema)`) turns Zod failures into a 400 with a message like `"customer.email: Invalid email address"`. It also *replaces* `req.body`/`req.query`/`req.params` with the parsed output, so defaults and transforms apply.
- Zod runs before the controller and can't see who is logged in. Put rules that depend on auth state (e.g. "guests must send X") in the controller as `ApiError(400)`s.
- **Response shapes are not uniform** across modules. Some return `{ success: true, order }`, others `{ customer }` or a bare document. Match the module you're editing, and never change an existing shape without flagging it as a breaking change for the frontend.
- **ObjectId params** are validated with `z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid X ID")`.
- **Security-sensitive identity:** on portal routes, take the acting user from `req.portalUser` (set by auth middleware), never from an id in the body. See the `auth-and-permissions` skill.

## Steps

1. **Validation:** add the schema to the module's validation file and export it in the default object. Reuse shared pieces (e.g. `deliveryAddressBody` from `delivery-address.validation.ts`, `customValidation.email` / `customValidation.required`).
2. **Service:** put the business logic and DB access here. Services throw `ApiError`s and return documents. Add a short JSDoc when the parameters aren't obvious.
3. **Controller:** extract input, call the service, send the response. Wrap the handler in `catchAsync`.
4. **Route:** chain `[rate limiter →] auth middleware → validate(...) → controller`. Admin routes pass a permission, e.g. `auth("manageOrders")`. Public endpoints that write data or send email should get a rate limiter (see `auth-and-permissions`).
5. **Register** the router in `src/routes/v1/index.ts` if the module is new.
6. **Docs:** update `src/docs/v1/*.doc.yml`. Schemas under `components.schemas` are merged across all YAML files, so a duplicate name (e.g. `Order` exists in both admin and portal order docs) silently overrides the other. Update both, or give new schemas unique names. For endpoints open to guests and logged-in users, use `security: [{}, {bearerAuth: []}]`.
7. **Verify** (see below).

## Verifying a change

There is no test framework or lint script. Verify with:

1. **Typecheck:** `npx tsc --noEmit -p tsconfig.json`. It should pass with no errors (on the `sandbox` branch). On older branches where Paystack is stubbed as `{}`, 2 errors in `src/services/bank.service.ts` are expected.
2. **Swagger builds:** import `createSwaggerSpec` from `@/docs/v1/swagger-def.js` in a temporary script and check your path or schema is present. A YAML indentation mistake silently drops content.
3. **HTTP end-to-end against a throwaway database.** `.env` points at the **real Atlas cluster**, so never run write tests against it.
   - Start a local `mongod` on a spare port with a scratch `--dbpath` (MongoDB 7.0 is installed at `C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe`), or use Docker.
   - Override the env vars on the command line. dotenv does not overwrite variables that are already set: `DATABASE_URL="mongodb://127.0.0.1:<port>/" DATABASE_NAME=zowkins_e2e NODE_ENV=test npx tsx <script>`
   - In the script, `import app from "@/app.js"`, `await connectDb()`, `app.listen(0)`, then drive endpoints with `fetch`. Mint tokens with `tokenService.generateAuthTokens(user, "Portal_User" | "Admin_User")`.
   - Guard the script with `if (!process.env.DATABASE_URL?.includes("127.0.0.1")) throw ...`.
   - The script must live **inside the project** (e.g. `scripts/_tmp.ts`) so `node_modules` and the `@/` alias resolve. Delete it afterwards.
   - **Stub side effects before driving the app.** Order creation, quotes, status updates and password resets send real SendPulse emails (to customers *and* to every admin with `manageOrders`), and `generatePaymentLink: true` calls Paystack. Service modules export plain objects, so replace their methods at the top of the script: `for (const k of Object.keys(emailService)) (emailService as any)[k] = async (args) => sent.push({ k, args })`, and likewise `paystack.initializeTransaction`. Record the calls to assert on them.
   - For password-reset flows, generate the token directly (`tokenService.generateResetPasswordToken`) instead of calling `reset-password`.
   - Multipart endpoints (e.g. `POST /portal/orders/quote`): build a `FormData`, put the JSON in a `data` field, and don't set `Content-Type` yourself.
   - Rate limiters are skipped when `NODE_ENV=test`. Run with `NODE_ENV=development` to test them.
