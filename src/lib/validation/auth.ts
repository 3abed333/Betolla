import { z } from "zod";

// Messages are i18n key paths (translated at render time in the form components via
// t(errors.field.message)), not literal display text - this is the one validation layer that
// feeds directly into user-visible form errors on the two auth pages.
export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "errors.firstNameRequired").max(60),
  lastName: z.string().trim().min(1, "errors.lastNameRequired").max(60),
  email: z.string().trim().toLowerCase().email("errors.validEmail"),
  username: z
    .string()
    .trim()
    .min(3, "errors.usernameMinLength")
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, "errors.usernameCharset"),
  password: z.string().min(8, "errors.passwordMinLength").max(200),
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
