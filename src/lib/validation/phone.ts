import { z } from "zod";

// Jordanian mobile numbers: 07[7|8|9]XXXXXXX, optionally prefixed with +962/00962 instead of the
// leading 0. Accepts common separators (spaces/dashes) before normalizing.
const JORDAN_MOBILE_PATTERN = /^(?:\+962|00962|0)7([789]\d{7})$/;

export function normalizeJordanianPhone(raw: string): string | null {
  const digits = raw.trim().replace(/[\s-]/g, "");
  const match = digits.match(JORDAN_MOBILE_PATTERN);
  if (!match) return null;
  return `07${match[1]}`;
}

export const jordanianPhoneSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    const normalized = normalizeJordanianPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Jordanian mobile number" });
      return z.NEVER;
    }
    return normalized;
  });
