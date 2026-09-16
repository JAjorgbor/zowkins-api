---
name: customer-accounts
description: How customers (Portal_User) work in the Zowkins API, including guest checkout and quotes, guest records, and how a guest's orders attach to an account created later with the same email. Use before touching portal users, customer queries, admin customer lists/stats, order or quote creation, order emails, sign-up, login or password reset.
---

# Customer accounts and guest checkout

## The model: one customer record per email

Customers are `Portal_User` documents (`src/models/portal.user.model.ts`). Each has an `accountType`:

| accountType | How it's created | Password | Can log in |
| --- | --- | --- | --- |
| `guest` | Order or quote without logging in (`POST /v1/portal/orders`, `POST /v1/portal/orders/quote` with no token), or an admin creating an order with a new customer's details | none | no |
| `registered` | `POST /v1/portal/auth/create-account`, or a guest upgraded (below) | yes | yes |

**A guest is never duplicated or merged. It is upgraded in place.** Orders reference `Portal_User._id` (`Order.customer`), so when a guest record becomes registered, every earlier order already belongs to the account. No re-linking query runs, and nothing can go out of sync.

## Lifecycle

```
checkout/quote (no token, new email) -> Portal_User { accountType: "guest" } + Order { isGuestOrder: true }
checkout (no token, guest email)    -> same record, contact details refreshed, new order
checkout (no token, registered email) -> order attached to that account; profile NOT modified,
                                       address NOT added to their address book
create-account (guest email)        -> same record: profile + password set, accountType "registered"
set-new-password (guest email)      -> same record upgraded, isEmailVerified = true
create-account (registered email)   -> 400 "Email already taken"
login (guest email)                 -> 401 "No account exists for this email yet..."
```

Where the logic lives:
- `portalUserService.upsertGuestCustomer`: find-or-create by email. Handles the duplicate-key race when two checkouts use the same new email. **Use this for any "customer details without a login" input** (checkout, quote, admin order with a customer object).
- `portalUserService.createPortalUser`: **account sign-up only**. It requires a password and claims a guest record if one exists. Don't use it as a find-or-create: an earlier version of the sandbox branch did, which silently returned existing registered users and skipped all of these rules.
- `portalAuthService.loginWithCredentials` / `setNewPassword`: guest handling.
- `portal.order.controller.createOrder`: branches on `req.portalUser` (logged in) vs guest.
- `orderService.requestOrderQuote`: the same branching for multipart quote requests (reads `req.portalUser` set by `optionalAuth`).
- `admin.order.controller.createOrder`: a `customer` object goes through `upsertGuestCustomer`; the order is not a guest order but still stores `customerDetails`.
- `orderService.createOrder`: `resolveCustomerDetails` builds the snapshot; `resolveDeliveryAddress` accepts a saved address id (must belong to the customer, else 403) or an object. Order confirmation / admin notification / quote emails use the snapshot, so they greet the name typed at checkout.
- `deliveryAddressService.saveDeliveryAddressIfNew`: guest address book, deduped on street/city/state/phone.

## Rules to keep

1. **Querying registered customers:** records created before `accountType` existed have no value stored. Mongoose shows the default `"registered"` when reading, but a *query* for `{ accountType: "registered" }` does not match them. Always use `{ accountType: { $ne: "guest" } }`. The same applies to `Order.isGuestOrder`: use `{ $ne: true }` for "not guest".
2. **Emails are lowercased and trimmed** (schema `lowercase: true`). Lowercase before any `findOne({ email })` on raw input.
3. **Anonymous input must never modify a registered account.** Only `guest` records get their contact details or addresses updated from a checkout.
4. **Orders snapshot contact details** in `Order.customerDetails` (what was typed at checkout). Display order contact info from the snapshot. `customer` (populated) is the *current* profile.
5. **Don't return password hashes.** `security.password` has `select: false`, but documents returned from `create()`/`save()` still carry it. The schema's `toJSON` transform strips it. Keep that transform if you change the schema options.
6. **Guests can't be referral partners** (they can't log in), so `getNonReferralPartners` excludes them. Any feature that needs a logged-in dashboard should exclude guests too.
7. **Admin-created orders** (`POST /v1/admin/orders`) still require a `customer` id and are not guest orders.

## Known limitation / follow-up

`create-account` claims a guest record without verifying the email. Anyone who knows a guest's email can register it and see that guest's order history (addresses, phone numbers). The password-reset path does verify ownership. If this becomes a concern, the fix is to require email verification before exposing orders placed before registration. `isEmailVerified` and the `VERIFY_EMAIL` token type already exist but have no flow yet.

## Related

- `add-api-endpoint`: layering, conventions, how to verify changes end to end.
- `auth-and-permissions`: `optionalAuth` and `requireSelf` middleware used by checkout and address routes.
