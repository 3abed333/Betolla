import { z } from "zod";

// Messages are i18n key paths (translated at render time in the form components via
// t(errors.field.message)), not literal display text - this is the one validation layer that
// feeds directly into user-visible form errors on the two auth pages.
export const registerSchema = z.object({
  customerType: z.enum(["INDIVIDUAL", "PHARMACY"]).default("INDIVIDUAL"),
  firstName: z.string().trim().max(60).optional().default(""),
  lastName: z.string().trim().max(60).optional().default(""),
  email: z.string().trim().toLowerCase().email("errors.validEmail"),
  username: z
    .string()
    .trim()
    .max(30)
    .regex(/^[a-zA-Z0-9._-]*$/, "errors.usernameCharset")
    .optional()
    .default(""),
  pharmacyName: z.string().trim().max(120).optional().default(""),
  pharmacyLocation: z.string().trim().max(500).optional().default(""),
  password: z.string().min(8, "errors.passwordMinLength").max(200),
  privacyAccepted: z.preprocess(
    (value) => value === true || value === "true" || value === "on",
    z.literal(true, { error: "errors.privacyRequired" }),
  ),
}).superRefine((value, ctx) => {
  if (value.customerType === "INDIVIDUAL") {
    if (!value.firstName) ctx.addIssue({ code: "custom", message: "errors.firstNameRequired", path: ["firstName"] });
    if (!value.lastName) ctx.addIssue({ code: "custom", message: "errors.lastNameRequired", path: ["lastName"] });
    if (value.username.length < 3) ctx.addIssue({ code: "custom", message: "errors.usernameMinLength", path: ["username"] });
  } else {
    if (!value.pharmacyName) ctx.addIssue({ code: "custom", message: "errors.pharmacyNameRequired", path: ["pharmacyName"] });
    if (!value.pharmacyLocation) ctx.addIssue({ code: "custom", message: "errors.pharmacyLocationRequired", path: ["pharmacyLocation"] });
  }
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("errors.validEmail"),
  password: z.string().min(1, "errors.passwordRequired"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "errors.currentPasswordRequired"),
    newPassword: z.string().min(8, "errors.passwordMinLength").max(200),
    confirmPassword: z.string().min(1, "errors.confirmPasswordRequired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "errors.passwordsDoNotMatch",
    path: ["confirmPassword"],
  });
