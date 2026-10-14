import mongoose, {
  type HydratedDocument,
  type InferSchemaType,
} from "mongoose";

// A pending email verification (OTP), started by sign-up or by logging in with an
// unverified email. Nothing is granted until the code is confirmed together with the
// verification token returned to whoever started it.
const emailVerificationSchema = new mongoose.Schema({
  purpose: {
    type: String,
    enum: ["signup", "login"],
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  // login: the account being verified
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Portal_User",
  },
  // signup: the account to create once verified. The password is already hashed.
  signup: {
    firstName: { type: String },
    lastName: { type: String },
    gender: { type: String, enum: ["male", "female"] },
    phoneNumber: { type: String },
    dateOfBirth: { type: Date },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "Referral_Partner" },
    passwordHash: { type: String },
  },
  // sha256 of the verification token handed to the client (the raw token is never stored)
  tokenHash: {
    type: String,
    required: true,
    unique: true,
  },
  // HMAC of the current code (the raw code is never stored)
  codeHash: {
    type: String,
    required: true,
  },
  codeExpiresAt: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  sendCount: {
    type: Number,
    default: 1,
  },
  lastSentAt: {
    type: Date,
    required: true,
  },
  // TTL index: the whole verification session is removed after this
  expiresAt: {
    type: Date,
    required: true,
    expires: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export type EmailVerificationType = InferSchemaType<typeof emailVerificationSchema>;
export type EmailVerificationDoc = HydratedDocument<EmailVerificationType>;

const EmailVerification = mongoose.model(
  "Email_Verification",
  emailVerificationSchema,
);

export default EmailVerification;
