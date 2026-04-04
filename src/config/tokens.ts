const tokenTypes = {
  ACCESS: "access",
  REFRESH: "refresh",
  RESET_PASSWORD: "resetPassword",
  VERIFY_EMAIL: "verifyEmail",
  UPDATE_EMAIL: "updateEmail",
  VERIFY_OTP: "verifyOTP",
  INVITE_ADMIN_USER: "inviteConsoleUser",
} as const;

export type ITokenTypes = (typeof tokenTypes)[keyof typeof tokenTypes];

export default tokenTypes;
