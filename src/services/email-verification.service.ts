import crypto from "crypto";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import config from "@/config/config.js";
import EmailVerification, {
  type EmailVerificationDoc,
} from "@/models/email-verification.model.js";
import PortalUser, { type PortalUserDoc } from "@/models/portal.user.model.js";
import ReferralPartner from "@/models/referral-partner.model.js";
import emailService from "@/services/email.service.js";
import portalUserService from "@/services/portal.user.service.js";
import ApiError from "@/utils/api-error.js";

/**
 * Email verification with a one-time code (OTP).
 *
 * Security model:
 * - Starting a verification returns a random `verificationToken` to the caller and
 *   emails a 6-digit code to the address. Verifying needs BOTH, so knowing someone's
 *   email is not enough, and a code only works with the session it was sent for.
 * - Only hashes are stored: sha256(token) and HMAC(secret, id:code).
 * - Each code allows MAX_ATTEMPTS guesses and expires after
 *   JWT_VERIFY_OTP_EXPIRATION_MINUTES; resends have a cooldown and a cap; the whole
 *   session expires after sessionMinutes() (at least an hour, and always long enough
 *   for a resent code to be used).
 * - Sign-up creates no account until verified, so an unverified sign-up can't claim or
 *   alter an existing record (e.g. a guest's order history).
 */

const MAX_ATTEMPTS = 5;
const MAX_SENDS = 5; // first email + 4 resends per session
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_SIGNUPS_PER_EMAIL_PER_HOUR = 5;

const codeTtlMinutes = () => config.jwt.verifyOTPExpirationMinutes;
const sessionMinutes = () => Math.max(60, codeTtlMinutes() * 2);

const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

const hashCode = (verificationId: string, code: string) =>
  crypto
    .createHmac("sha256", config.jwt.secret)
    .update(`${verificationId}:${code}`)
    .digest("hex");

const codesMatch = (a: string, b: string) =>
  a.length === b.length &&
  crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));

const generateCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000);

export type VerificationChallenge = {
  requiresEmailVerification: true;
  verificationToken: string;
  email: string;
  expiresInMinutes: number;
  resendAvailableInSeconds: number;
};

const sendCode = async (email: string, firstName: string, code: string) => {
  await emailService.portalVerifyEmailOtp({
    toEmail: email,
    firstName,
    otp: code,
    expirationInMinutes: codeTtlMinutes(),
  });
};

/** Create a verification session, email its first code, and return the challenge for the client. */
const createSession = async (
  fields: {
    purpose: "signup" | "login";
    email: string;
    user?: PortalUserDoc["_id"];
    signup?: Record<string, unknown>;
  },
  firstName: string,
): Promise<VerificationChallenge> => {
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const code = generateCode();
  const verification = new EmailVerification({
    ...fields,
    tokenHash: sha256(verificationToken),
    codeHash: "pending",
    codeExpiresAt: minutesFromNow(codeTtlMinutes()),
    lastSentAt: new Date(),
    expiresAt: minutesFromNow(sessionMinutes()),
  });
  verification.codeHash = hashCode(verification._id.toString(), code);
  await verification.save();

  try {
    await sendCode(fields.email, firstName, code);
  } catch (error) {
    await verification.deleteOne();
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "We couldn't send the verification email. Please try again",
    );
  }

  return {
    requiresEmailVerification: true,
    verificationToken,
    email: fields.email,
    expiresInMinutes: codeTtlMinutes(),
    resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
  };
};

/**
 * Sign-up step 1: validate the request, hold the account details (password hashed)
 * and email a code. No Portal_User is created or changed here.
 */
const startSignup = async (body: {
  firstName: string;
  lastName: string;
  gender?: "male" | "female";
  email: string;
  phoneNumber: string;
  password: string;
  dateOfBirth?: string;
  referralCode?: string;
}) => {
  const email = body.email.toLowerCase().trim();

  const existing = await PortalUser.findOne({ email });
  if (existing && existing.accountType !== "guest") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }

  // Stops the sign-up form being used to flood someone's inbox
  const recentSignups = await EmailVerification.countDocuments({
    email,
    purpose: "signup",
    createdAt: { $gt: minutesFromNow(-60) },
  });
  if (recentSignups >= MAX_SIGNUPS_PER_EMAIL_PER_HOUR) {
    throw new ApiError(
      httpStatus.TOO_MANY_REQUESTS,
      "Too many sign-up attempts for this email. Please try again later",
    );
  }

  let referredBy;
  if (body.referralCode) {
    const partner = await ReferralPartner.findOne({
      referralCode: body.referralCode,
      status: "active",
    });
    referredBy = partner?._id;
  }

  return createSession(
    {
      purpose: "signup",
      email,
      signup: {
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender,
        phoneNumber: body.phoneNumber,
        dateOfBirth: body.dateOfBirth,
        referredBy,
        passwordHash: await bcrypt.hash(body.password, 8),
      },
    },
    body.firstName,
  );
};

/**
 * Login with an unverified email: the password was already checked. Replaces any
 * earlier login verification for this user and emails a new code.
 */
const startLoginVerification = async (user: PortalUserDoc) => {
  await EmailVerification.deleteMany({ user: user._id, purpose: "login" });
  return createSession(
    { purpose: "login", email: user.email, user: user._id },
    user.firstName,
  );
};

const findActiveSession = async (verificationToken: string) => {
  const verification = await EmailVerification.findOne({
    tokenHash: sha256(verificationToken),
    expiresAt: { $gt: new Date() },
  });
  if (!verification) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This verification session has expired. Please sign up or log in again",
    );
  }
  return verification;
};

/** Email a new code for an existing session (cooldown + cap enforced atomically). */
const resendCode = async (verificationToken: string) => {
  const current = await findActiveSession(verificationToken);
  const now = new Date();
  const code = generateCode();

  const updated = await EmailVerification.findOneAndUpdate(
    {
      _id: current._id,
      sendCount: { $lt: MAX_SENDS },
      lastSentAt: { $lte: new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000) },
    },
    {
      $set: {
        codeHash: hashCode(current._id.toString(), code),
        codeExpiresAt: minutesFromNow(codeTtlMinutes()),
        attempts: 0,
        lastSentAt: now,
      },
      $inc: { sendCount: 1 },
    },
    { new: true },
  );

  if (!updated) {
    if (current.sendCount >= MAX_SENDS) {
      throw new ApiError(
        httpStatus.TOO_MANY_REQUESTS,
        "Too many codes requested. Please sign up or log in again",
      );
    }
    const waitSeconds = Math.ceil(
      (current.lastSentAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000 - now.getTime()) / 1000,
    );
    throw new ApiError(
      httpStatus.TOO_MANY_REQUESTS,
      `Please wait ${Math.max(waitSeconds, 1)} seconds before requesting a new code`,
    );
  }

  const firstName =
    updated.signup?.firstName ??
    (await PortalUser.findById(updated.user))?.firstName ??
    "";
  try {
    await sendCode(updated.email, firstName, code);
  } catch {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "We couldn't send the verification email. Please try again",
    );
  }

  return {
    expiresInMinutes: codeTtlMinutes(),
    resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
    resendsRemaining: MAX_SENDS - updated.sendCount,
  };
};

/**
 * Check a code. On success the session is consumed (one use only) and the verified
 * account is returned: newly created / upgraded from a guest for sign-up, or marked
 * verified for login.
 */
const verifyCode = async (verificationToken: string, code: string) => {
  const session = await findActiveSession(verificationToken);

  // Count the attempt before comparing, atomically, so parallel guesses can't exceed the limit
  const counted = await EmailVerification.findOneAndUpdate(
    { _id: session._id, attempts: { $lt: MAX_ATTEMPTS } },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!counted) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Too many incorrect attempts. Request a new code",
    );
  }
  if (counted.codeExpiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This code has expired. Request a new code",
    );
  }
  if (!codesMatch(hashCode(counted._id.toString(), code), counted.codeHash)) {
    const remaining = MAX_ATTEMPTS - counted.attempts;
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      remaining > 0
        ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left`
        : "Incorrect code. Request a new code",
    );
  }

  // Consume the session; if a parallel request already did, stop here
  const consumed = await EmailVerification.findOneAndDelete({ _id: counted._id });
  if (!consumed) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This verification session has expired. Please sign up or log in again",
    );
  }

  if (consumed.purpose === "login") {
    const user = await PortalUser.findById(consumed.user);
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "Account not found");
    user.isEmailVerified = true;
    await user.save();
    return user;
  }

  const user = await portalUserService.completeSignup(consumed as EmailVerificationDoc);
  // Other pending sign-ups for this email can no longer complete
  await EmailVerification.deleteMany({ email: consumed.email, purpose: "signup" });
  return user;
};

export default {
  startSignup,
  startLoginVerification,
  resendCode,
  verifyCode,
};
