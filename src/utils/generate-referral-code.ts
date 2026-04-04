import crypto from "crypto";

/**
 * Generates a random alphanumeric referral code.
 * @param length The length of the code to generate.
 * @returns A random alphanumeric string.
 */
export const generateReferralCode = (length: number = 6): string => {
  // Using a custom alphabet to avoid ambiguous characters like 0, O, 1, I
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const charactersLength = characters.length;

  // Use crypto for better randomness
  const randomBytes: any = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters.charAt(randomBytes[i] % charactersLength);
  }

  return result;
};
