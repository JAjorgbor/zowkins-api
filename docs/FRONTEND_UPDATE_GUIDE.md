# Frontend Update Guide: Customer Accounts, Guest Orders, Security Fixes and Rate Limits

This guide lists API changes that the **storefront / customer portal** and the **admin console** need to pick up. It is written against the current sandbox API: checkout and quotes that work without an account, and Paystack payment links. Each section says what changed, whether current code breaks, and what to do.

Full request and response details are in Swagger at `/v1/docs` on any running API.

## At a glance

| # | Change | Breaks current code? | Where |
| --- | --- | --- | --- |
| 1 | Customer accounts are back (sign up, login, profile, addresses, order history) | No (new) | Storefront account area |
| 2 | Checkout and quotes also work **while logged in** | No (additive) | Checkout, quote form |
| 3 | Orders placed without an account show up once that email signs up | No (new flow) | After checkout, sign-up, login |
| 4 | Validation errors are 400, not 500 | Behaviour change | All forms |
| 5 | Too many requests return 429 | New | Checkout, quote, login, sign-up, forgot password |
| 6 | New fields on customers and orders | No (additive) | Order and customer screens |
| 7 | Admin: guest filters, stats, and saved addresses when creating orders | No (additive) | Admin console |

**Current checkout and quote requests keep working unchanged.** Nothing in sections 2, 6 or 7 breaks today's requests.

---

## 1. Customer accounts are back

These endpoints were switched off and are available again:

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/portal/auth/create-account` | Sign up; returns `{ user, accessToken }` and sets the refresh cookie |
| `POST /v1/portal/auth/login` | Log in; returns `{ user, accessToken }` and sets the refresh cookie |
| `POST /v1/portal/auth/refresh-tokens` | New access token from the `portalRefreshToken` cookie |
| `POST /v1/portal/auth/logout` | Log out |
| `POST /v1/portal/auth/reset-password` | Email a reset link |
| `POST /v1/portal/auth/set-new-password/:token` | Set a new password from the link; logs the customer in |
| `GET` / `PATCH /v1/portal/users/me` | View / update profile |
| `PATCH /v1/portal/users/me/password` | Change password |
| `GET /v1/portal/orders` | The customer's orders (including quotes) |
| `GET /v1/portal/orders/recent` | Last 5 orders |
| `GET /v1/portal/orders/stats` | Counts per status and total spent |
| `GET /v1/portal/orders/:orderId` | One order (only the customer's own) |
| `/v1/portal/delivery-address/:userId` (+ `/:addressId`) | Address book: list, add, view, update, delete |

### Things to know

- Send the access token as `Authorization: Bearer <accessToken>`.
- The refresh token lives in an httpOnly cookie, so send auth requests with `credentials: "include"`.
- **Address book endpoints only work for the logged-in customer's own id.** Missing token returns 401; another customer's id returns 403.
- Sign-up password rules: at least 8 characters, with at least one letter and one number.

---

## 2. Checkout and quotes: guest or logged in

Both endpoints accept the same requests as before. They now also accept a logged-in customer.

### `POST /v1/portal/orders`

**Guest (no `Authorization` header), unchanged from today:**

```json
{
  "customer": {
    "firstName": "Ada",
    "lastName": "Obi",
    "gender": "female",
    "email": "ada@example.com",
    "phoneNumber": "08030000000"
  },
  "items": [{ "productId": "64b7f0c2e1a2b3c4d5e6f701", "quantity": 2 }],
  "deliveryAddress": {
    "phoneNumber": "08030000000",
    "street": "12 Allen Avenue",
    "city": "Ikeja",
    "state": "Lagos"
  },
  "deliveryMethod": "64b7f0c2e1a2b3c4d5e6f702",
  "generatePaymentLink": true,
  "callbackUrl": "https://zowkins.vercel.app/payment/callback"
}
```

**Logged in (send the `Authorization` header):**

```json
{
  "items": [{ "productId": "64b7f0c2e1a2b3c4d5e6f701", "quantity": 2 }],
  "deliveryAddress": "64b7f0c2e1a2b3c4d5e6f703",
  "deliveryMethod": "64b7f0c2e1a2b3c4d5e6f702",
  "generatePaymentLink": true,
  "callbackUrl": "https://zowkins.vercel.app/payment/callback"
}
```

| Field | Guest | Logged in |
| --- | --- | --- |
| `customer` | **required**: `firstName`, `lastName`, `email`, `phoneNumber` (`gender` optional) | not needed; **ignored if sent** (the token decides who the customer is) |
| `deliveryAddress` | **must be a full address object** (an id returns 400) | a **saved address id** or a full address object |
| `deliveryAddress.phoneNumber` | required, at least 9 characters | same |
| `deliveryAddress.street` | required, at least 3 characters | same |
| `deliveryAddress.city`, `deliveryAddress.state` | required, at least 2 characters | same |
| `deliveryAddress.country`, `deliveryAddress.postalCode` | optional (`country` defaults to Nigeria) | same |
| `generatePaymentLink`, `callbackUrl` | unchanged | unchanged |

The response is unchanged: `{ "success": true, "paymentLink": "https://checkout.paystack.com/..." }`. `paymentLink` is only present when `generatePaymentLink` is true.

### `POST /v1/portal/orders/quote` (multipart)

The same rules apply to the JSON in the `data` field:

- **Guest:** `customer` and a full `deliveryAddress` object are required (as today).
- **Logged in:** send the `Authorization` header. `customer` can be left out, and `deliveryAddress` can be a saved address id.

Response is unchanged: `{ "success": true, "order": { ... } }`.

### Things to watch

- **Don't send an expired or invalid token.** If a token is sent, it must be valid, otherwise you get **401**. It is not treated as a guest request. If refreshing the token fails, clear it and send the request without the header.
- A saved address id that doesn't belong to the logged-in customer returns **403**.

---

## 3. From guest to account (new flow)

When someone orders or requests a quote without an account, the API saves their details by email. Their orders stay linked to that email.

**When the same email later signs up, all of those earlier orders and quotes show up in the new account straight away.** You don't need to call anything extra.

### What to build

1. **After a guest order or quote:** show a prompt such as
   *"Create an account with `ada@example.com` to track this order."*
   Prefill the sign-up form with the name, email and phone they just entered.
2. **Sign-up** with that email **succeeds**. It won't say "Email already taken".
3. **Login attempt by a guest** returns **401** with:
   > No account exists for this email yet. Create an account to access your orders

   Show this message and link to sign-up.
4. **Forgot password** also works for guests. Completing the reset link turns them into a full account with the same orders.

### Good to know

- If someone orders while logged out using an email that **already has an account**, the order is added to that account. The account's profile isn't changed.
- A guest's delivery address is saved for them, so it appears in their address book after sign-up.
- Order emails use the name and email typed at checkout.

---

## 4. Validation errors are now 400

Invalid input used to come back as **500**, and production hid the message. It now returns **400** with a readable message naming the field:

```json
{ "code": 400, "message": "customer.email: Invalid email address" }
```

When several fields fail, their messages are joined with a comma and a space. You can show `message` near the form, or split it and match the part before the colon to a field.

All errors still use the same shape: `{ "code": <status>, "message": "<text>" }`.

---

## 5. Rate limits (429 Too Many Requests)

To stop abuse, some endpoints limit how often **one network (IP address)** can call them:

| Endpoint | Limit | Notes |
| --- | --- | --- |
| `POST /v1/portal/orders` | 20 per hour | Guests and logged-in customers |
| `POST /v1/portal/orders/quote` | 10 per hour | Guests and logged-in customers |
| `POST /v1/portal/auth/login` | 10 **failed** attempts per 15 min | Successful logins don't count |
| `POST /v1/admin/auth/login` | 10 **failed** attempts per 15 min | Separate from customer login |
| `POST /v1/portal/auth/create-account` | 10 per hour | |
| `POST /v1/portal/auth/reset-password` and `POST /v1/admin/auth/reset-password` | 5 per hour (shared) | Each request sends an email |

When a limit is hit, the API returns:

```json
{ "code": 429, "message": "Too many orders from this network. Please try again later" }
```

These response headers are readable from the browser:

| Header | Meaning |
| --- | --- |
| `Retry-After` | Seconds until the client can try again (only on 429) |
| `RateLimit` | Remaining requests (`r`) and seconds until reset (`t`), e.g. `"checkout"; r=0; t=3540` |
| `RateLimit-Policy` | The limit (`q`) per window in seconds (`w`), e.g. `"checkout"; q=20; w=3600; pk=:...:` |

### Handling 429 in the UI

- Handle **429** on these forms: show `message` and don't retry automatically.
- Optionally use `Retry-After` for a countdown, e.g. "Try again in 12 minutes".
- Disable the submit button while a request is in flight, so double-clicks don't use up the limit.

---

## 6. New fields in responses

### Customer / user objects

| Field | Values | Meaning |
| --- | --- | --- |
| `accountType` | `"guest"` or `"registered"` | Guests were saved from an order or quote and can't log in |

Password hashes are never included in responses.

### Order objects

| Field | Meaning |
| --- | --- |
| `isGuestOrder` | `true` if placed without logging in |
| `customerDetails.firstName`, `.lastName`, `.email`, `.phoneNumber` | Contact details **as typed at checkout** |

Use `customerDetails` to show who an order is for. It stays as it was at checkout even if the customer later edits their profile, while `customer` reflects the current profile.

---

## 7. Admin console

| Change | How to use it |
| --- | --- |
| Filter customers by type | `GET /v1/admin/customers?accountType=guest` or `?accountType=registered` |
| Guest badge | Show a "Guest" badge when `accountType === "guest"` |
| Customer stats | `GET /v1/admin/customers/stats` now also returns `guestUsers` and `registeredUsers` |
| Filter orders | `GET /v1/admin/orders?isGuestOrder=true` or `?isGuestOrder=false` |
| Order detail | Show `customerDetails` (what the customer typed) next to the linked customer |
| Create order | `POST /v1/admin/orders` works as before. `customer` is an id or a details object; a details object whose email already has an account attaches the order to that account without editing its profile. `deliveryAddress` can now also be the id of an address saved on that customer |
| Admin login and reset | Can now return 429 (see section 5) |

---

## Checklist

### Storefront / customer portal

- [ ] Account pages: sign up, login, logout, refresh token (`credentials: "include"`), forgot / reset password
- [ ] Profile page and change password
- [ ] Address book (always send the token and use the logged-in user's id)
- [ ] Orders page, recent orders, stats, order detail
- [ ] Checkout and quote form: when logged in, send the token, skip the customer form, offer saved addresses
- [ ] Never send an invalid token; fall back to guest mode
- [ ] After a guest order or quote: prompt to create an account (prefilled)
- [ ] Login: handle the "No account exists for this email yet" message
- [ ] Forms: show 400 validation messages
- [ ] Checkout, quote, login, sign-up, forgot password: handle 429 (optionally with `Retry-After`)
- [ ] Order screens: use `customerDetails` for contact info

### Admin console

- [ ] Customers: `accountType` filter and "Guest" badge
- [ ] Customer stats: show guest and registered counts
- [ ] Orders: `isGuestOrder` filter; show `customerDetails`
- [ ] Login and reset password: handle 429
