---
name: disabled-modules
description: Modules in the Zowkins API that exist in code but are switched off (referral partners, bank account lookups), and exactly what to change to re-enable or remove them. Use when a request mentions referral partners, commissions, banks, bank account verification, or "commented out" features.
---

# Disabled modules

Some features were inherited from the codebase this API was built from (PharmaHub Medica). They are still in the repo but **not reachable**. What disables them is mostly route registration and docs exclusion.

> History: on the `sandbox` branch, customer accounts (portal auth, profile, delivery addresses, order history) were also commented out for a while, including the password fields on `Portal_User`. They have been restored together with guest orders linked by email (see `customer-accounts`). If you find account code commented out on another branch, that's the same feature.

## Referral partners

Customers (`Portal_User` with `isReferralPartner: true`) who earn commission on orders from customers they referred.

**Code present and live in the data layer:**
- Model `src/models/referral-partner.model.ts`, service `referral-partner.service.ts`, controllers `admin.referral-partner.controller.ts` / `portal.referral-partner.controller.ts`, validations, docs.
- `Portal_User.referredBy`, `isReferralPartner`. `createPortalUser` still honours a `referralCode` at sign-up.
- `orderService.createOrder` still computes `Order.referralDetails.commission` when the customer has `referredBy`. Admin order update accepts `referralCommissionStatus/Note`.
- Admin permissions `getReferralPartners` / `manageReferralPartners` exist in `roles.ts`.

**What is switched off:**
- `src/routes/v1/index.ts`: `/portal/referral-partners` and `/admin/referral-partners` are commented out of `defaultRoutes`.
- `src/docs/v1/swagger-def.ts`: both referral-partner YAML files are in `excludedFiles`.

**To re-enable:** uncomment both route entries, remove both files from `excludedFiles`, then check:
- `addReferralPartner` sends an email via `emailService.notifyAddedReferralPartner`. Check that its SendPulse template id (67564) exists in the Zowkins SendPulse account.
- `getReferralPartner` **throws 404** when nothing is found, and `createOrder` calls it for any customer with `referredBy`. If a partner is deleted, orders from their referred customers fail. Guard this before going live.
- Guest customers can't be partners (see the `customer-accounts` skill).
- `getTopReferralPartners` hard-codes collection names `portal_users` / `orders` in `$lookup`. Confirm them against the real DB.

## Bank account lookups (Paystack)

List banks and resolve account numbers, used for referral partner payout details.

**What is switched off:**
- `src/routes/v1/index.ts`: `/portal/banks` and `/admin/banks` commented out.
- `src/services/bank.service.ts`: both functions return `undefined`, with their Paystack calls commented out.
- Both bank YAML files are in `excludedFiles`.

Paystack itself **is** live on `sandbox` for payments: `src/config/paystack.ts` wraps the SDK and exports only `initializeTransaction` and `verifyTransaction` (used by payment links and the `/v1/payment/paystack/webhook` handler).

**To re-enable:** add bank-list and account-resolve wrappers to `src/config/paystack.ts` (the SDK's `verification.fetchBanks` / `verification.resolveAccountNumber`), call them from `bank.service.ts`, uncomment both routes, and un-exclude the docs. The old commented-out call hard-coded `bank_code: "001"` and ignored its `bankCode` argument; pass the argument through.

## Removing instead

If the business decides these are never coming back, delete the module files, the route/doc entries, the `referralDetails` block in `order.model.ts` and `order.service.ts`, the related fields on `Portal_User`, and the permissions in `roles.ts`. Check the admin frontend for screens that call them first.
