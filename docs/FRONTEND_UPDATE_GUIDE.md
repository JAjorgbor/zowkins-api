# Frontend Update Guide: Customer Accounts, Email Verification, Guest Orders, Security Fixes and Rate Limits

This guide lists API changes that the **storefront / customer portal** and the **admin console** need to pick up. It is written against the current sandbox API: checkout and quotes that work without an account, and Paystack payment links. Each section says what changed, whether current code breaks, and what to do.

Full request and response details are in Swagger at `/v1/docs` on any running API.

## At a glance

| # | Change | Breaks current code? | Where |
| --- | --- | --- | --- |
| 1 | Customer accounts are back (sign up, login, profile, addresses, order history) | No (new) | Storefront account area |
| 1b | **Email verification with a 6-digit code is mandatory** for sign-up, and for login until the email is verified | **Yes, if you already call sign-up/login**: they no longer always return tokens | Sign-up, login, a new "enter code" screen |
| 2 | Checkout and quotes also work **while logged in** | No (additive) | Checkout, quote form |
| 3 | Orders placed without an account show up once that email signs up | No (new flow) | After checkout, sign-up, login |
| 4 | Validation errors are 400, not 500 | Behaviour change | All forms |
| 5 | Too many requests return 429 | New | Checkout, quote, login, sign-up, code entry / resend, forgot password |
| 6 | New fields on customers and orders | No (additive) | Order and customer screens |
| 7 | Admin: guest filters, stats, and saved addresses when creating orders | No (additive) | Admin console |

**Current checkout and quote requests keep working unchanged.** Nothing in sections 2, 6 or 7 breaks today's requests.

---

## 1. Customer accounts are back

These endpoints were switched off and are available again:

| Endpoint | Purpose |
| --- | --- |
| `POST /v1/portal/auth/create-account` | Sign-up step 1: emails a 6-digit code and returns a `verificationToken` (**no tokens yet**, see 1b) |
| `POST /v1/portal/auth/verify-email` | Confirms the code; creates/verifies the account and logs in: returns `{ user, accessToken }` and sets the refresh cookie |
| `POST /v1/portal/auth/resend-otp` | Emails a new code |
| `POST /v1/portal/auth/login` | Log in; returns `{ user, accessToken }` and sets the refresh cookie, **or 403 asking for email verification** (see 1b) |
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
- Sign-up password rules: at least 8 characters, with at least one letter and one number. These are checked at step 1, so show the 400 message on the sign-up form.

---

## 1b. Email verification (one-time code), mandatory

No customer gets an access token until their email address is verified with a 6-digit code sent by email. This applies to **every new sign-up** and to **any login by an account whose email isn't verified yet** (including all accounts created before this change).

### The flow

```text
Sign-up form ── POST /create-account ──► 202 { requiresEmailVerification, verificationToken, ... }
                                                        │
Login form ──── POST /login ──► 200 { user, accessToken }            (verified: done)
                            └─► 403 { requiresEmailVerification, verificationToken, ... }
                                                        │
                                                        ▼
                                     "Enter the code we emailed to <email>" screen
                                       │                              │
                   POST /verify-email { verificationToken, otp }   POST /resend-otp { verificationToken }
                                       │                              (after the countdown)
                                       ▼
                        200 { user, accessToken } + refresh cookie   (logged in)
```

### Step 1a: sign-up, `POST /v1/portal/auth/create-account`

Request body is the same as before (`firstName`, `lastName`, `email`, `phoneNumber`, `password`, optional `gender`, `dateOfBirth`, `referralCode`).

Response **202** (no user, no access token, no cookie):

```json
{
  "requiresEmailVerification": true,
  "verificationToken": "3f9c0e8d7b6a5f4e3d2c1b0a99887766554433221100ffeeddccbbaa99887766",
  "email": "ada@example.com",
  "expiresInMinutes": 10,
  "resendAvailableInSeconds": 60
}
```

The account does not exist until the code is confirmed. If the customer abandons the flow, nothing is created.

### Step 1b: login, `POST /v1/portal/auth/login`

- **Verified email:** unchanged, `200 { user, accessToken }` + refresh cookie.
- **Correct password, email not verified:** **403**. A code is emailed automatically:

```json
{
  "code": 403,
  "message": "Please verify your email to continue. We've sent you a code",
  "requiresEmailVerification": true,
  "verificationToken": "…64 hex characters…",
  "email": "ada@example.com",
  "expiresInMinutes": 10,
  "resendAvailableInSeconds": 60
}
```

A 403 from login can also mean "Your account is not active". **Check `requiresEmailVerification === true`** to tell them apart; only then go to the code screen.

A wrong password is still **401** and sends no code.

### Step 2: enter the code, `POST /v1/portal/auth/verify-email`

```json
{ "verificationToken": "…from step 1…", "otp": "048213" }
```

- **200:** `{ user, accessToken }` + refresh cookie, exactly like a successful login. The customer is now logged in and verified; later logins return 200 directly.
- **400**, show `message` on the code screen:

| `message` starts with | What to do |
| --- | --- |
| `Incorrect code. N attempts left` | Let them try again |
| `Too many incorrect attempts` or `This code has expired` | Offer "Resend code" |
| `This verification session has expired` | Send them back to sign-up / login to start again |

Validation: `otp` must be exactly 6 digits (as a **string**, so leading zeros are kept); `verificationToken` is the 64-character value from step 1.

### Resend: `POST /v1/portal/auth/resend-otp`

```json
{ "verificationToken": "…same token…" }
```

- **200** `{ "expiresInMinutes": 10, "resendAvailableInSeconds": 60, "resendsRemaining": 3 }`: a new code was emailed and the old one stopped working.
- **429** `Please wait N seconds before requesting a new code`: resend is allowed once every 60 seconds.
- **429** `Too many codes requested…`: after 4 resends, the customer must sign up / log in again (which starts a new session).
- **400** `This verification session has expired…`: start again from sign-up / login.

### Rules to build the screen around

- **Keep `verificationToken` in memory** (component or store state) for the code screen only. Don't put it in the URL, `localStorage` or analytics. It is what ties the code to this browser session; a code from the email doesn't work without it.
- **Show a resend countdown** from `resendAvailableInSeconds` (60) and disable "Resend code" until it reaches 0. Restart the countdown after each successful resend.
- Show "Code expires in `expiresInMinutes` minutes" and the `email` it was sent to, with a "Wrong email? Go back" link.
- Use a numeric input with `autocomplete="one-time-code"` and `inputmode="numeric"`, max length 6.
- If the customer signs up twice, only the latest email's code works with the latest token.
- **503** from sign-up, login or resend means the email couldn't be sent. Nothing was saved (for sign-up); let them retry.

### Existing sessions

Tokens of accounts whose email isn't verified are no longer accepted: any authenticated request returns **401** `Please verify your email. Log in again to receive a verification code`, and `refresh-tokens` returns 401. Treat this like any 401: clear the session and send the customer to login, where the 403 flow above takes over.

### Password reset also verifies

Completing a password reset (`set-new-password`) proves the customer owns the email, so it marks it verified and logs them in without a code.

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
2. **Sign-up** with that email **succeeds** (it won't say "Email already taken") and goes through the code step in 1b. Their earlier orders are attached **only after** the code is confirmed, so nobody can claim someone else's orders just by knowing their email.
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
| `POST /v1/portal/auth/create-account` | 10 per hour per network, and 5 per hour per email address | Each request sends a code email |
| `POST /v1/portal/auth/verify-email` | 20 per 15 min | On top of 5 attempts per code |
| `POST /v1/portal/auth/resend-otp` | 10 per hour per network | On top of the 60-second cooldown and 4 resends per session |
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
- [ ] Sign-up: on 202 go to the code screen (no tokens yet)
- [ ] Login: on 403 with `requiresEmailVerification: true` go to the code screen; other 403s show the message
- [ ] Code screen: 6-digit input, `verify-email`, error messages, resend with 60-second countdown, "wrong email" link; keep `verificationToken` in memory only
- [ ] On 200 from `verify-email`, store the access token exactly as after login
- [ ] Any 401 "Please verify your email…": clear the session and go to login
- [ ] Profile page and change password
- [ ] Address book (always send the token and use the logged-in user's id)
- [ ] Orders page, recent orders, stats, order detail
- [ ] Checkout and quote form: when logged in, send the token, skip the customer form, offer saved addresses
- [ ] Never send an invalid token; fall back to guest mode
- [ ] After a guest order or quote: prompt to create an account (prefilled)
- [ ] Login: handle the "No account exists for this email yet" message
- [ ] Forms: show 400 validation messages
- [ ] Checkout, quote, login, sign-up, verify / resend code, forgot password: handle 429 (optionally with `Retry-After`)
- [ ] Order screens: use `customerDetails` for contact info

### Admin console

- [ ] Customers: `accountType` filter and "Guest" badge
- [ ] Customer stats: show guest and registered counts
- [ ] Orders: `isGuestOrder` filter; show `customerDetails`
- [ ] Login and reset password: handle 429
